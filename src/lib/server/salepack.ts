/**
 * The "sale pack": a PDF history of a vehicle to give a buyer.
 * Only buyer-relevant facts go in. Policy numbers, key codes, finance and
 * emergency contacts are never included, and documents are opt-in.
 */
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { formatDate, formatMoney, vehicleName } from '$lib/format';
import { milesPerYear, recordKindLabel } from '$lib/history';
import { monthName, taxBand } from '$lib/emissions';
import { todayISO } from '$lib/status';
import type { DocumentRow, MotAdvisory, MotDefect, MotTest, ServiceRecord, Vehicle } from '$lib/types';
import { db } from './db';
import { documentPath, listDocuments } from './documents';
import { listRecords, mileageHistory } from './history';
import { listAdvisories } from './advisories';
import { listItems } from './vehicles';
import { AMBER, GREEN, INK, MUTED, PLATE, PdfWriter, RED } from './pdf';

export interface SalePackOptions {
	vin: boolean;
	mileage: boolean;
	service: boolean;
	notes: boolean;
	costs: boolean;
	mot: boolean;
	docIds: number[];
	/** Free text from the seller, e.g. "Two keys, full service history". */
	sellerNote: string | null;
}

/** Only these kinds of document can be put into the PDF. */
export const EMBEDDABLE = ['application/pdf', 'image/jpeg', 'image/png'];

interface Attachment {
	doc: DocumentRow & { stored_name: string };
	bytes?: Uint8Array;
	pdf?: PDFDocument;
	pages: number;
	problem?: string;
}

export async function buildSalePack(vehicle: Vehicle, opts: SalePackOptions): Promise<Uint8Array> {
	const w = await PdfWriter.create();
	const today = todayISO();
	const records = listRecords(vehicle.id);
	const readings = mileageHistory(vehicle.id);
	const tests = db()
		.prepare('SELECT * FROM mot_tests WHERE vehicle_id = ? ORDER BY completed_at DESC')
		.all(vehicle.id) as MotTest[];
	const advisories = listAdvisories(vehicle.id).filter((a) => a.test_number);
	const mot = listItems([vehicle.id]).find((i) => i.type === 'mot');
	const services = records.filter((r) => r.kind === 'service');

	/* ---------- cover ---------- */
	const plateW = Math.max(150, w.measure(vehicle.registration, 26, true) + 36);
	w.page.drawRectangle({ x: PdfWriter.MARGIN, y: w.y - 40, width: plateW, height: 44, color: PLATE, borderColor: INK, borderWidth: 1 });
	w.text(vehicle.registration, PdfWriter.MARGIN + (plateW - w.measure(vehicle.registration, 26, true)) / 2, w.y - 28, { size: 26, bold: true });
	w.gap(70);
	const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicleName(vehicle);
	w.text(makeModel, PdfWriter.MARGIN, w.y, { size: 22, bold: true });
	w.gap(20);
	w.text([vehicle.year, vehicle.colour, vehicle.fuel_type].filter(Boolean).join(' · '), PdfWriter.MARGIN, w.y, { size: 12, color: MUTED });
	w.gap(14);
	w.text('Vehicle history', PdfWriter.MARGIN, w.y, { size: 12, color: MUTED });

	const latest = readings[0];
	const passes = tests.filter((t) => /^PASS/i.test(t.result));
	const motUntil = mot?.due_date ?? passes[0]?.expiry_date ?? null;
	const tax = taxBand(vehicle);
	w.heading('The vehicle');
	w.facts(
		[
			['Make and model', makeModel],
			['Year', vehicle.year ? String(vehicle.year) : ''],
			['First registered', vehicle.first_registered ? monthName(vehicle.first_registered) : ''],
			['Colour', vehicle.colour ?? ''],
			['Fuel', vehicle.fuel_type ?? ''],
			['Engine', vehicle.engine_cc ? `${vehicle.engine_cc.toLocaleString('en-GB')} cc` : ''],
			['CO2', vehicle.co2_emissions != null ? `${vehicle.co2_emissions} g/km` : ''],
			['Euro status', vehicle.euro_status ?? ''],
			['Road tax band', tax?.label ?? ''],
			['VIN', opts.vin ? (vehicle.vin ?? '') : ''],
			['Mileage', latest ? `${latest.mileage.toLocaleString('en-GB')} miles (as of ${formatDate(latest.date)})` : ''],
			['MOT valid until', motUntil ? formatDate(motUntil) : '']
		].filter(([, v]) => v) as [string, string][]
	);

	const summary: string[] = [];
	if (services.length) {
		const last = services[0];
		summary.push(`${services.length} service${services.length === 1 ? '' : 's'} recorded. The most recent was on ${formatDate(last.date)}${last.mileage != null ? ` at ${last.mileage.toLocaleString('en-GB')} miles` : ''}${last.garage ? ` (${last.garage})` : ''}.`);
	}
	if (records.length > services.length) summary.push(`${records.length - services.length} other repair, tyre or parts record${records.length - services.length === 1 ? '' : 's'}.`);
	if (tests.length) summary.push(`${tests.length} MOT test${tests.length === 1 ? '' : 's'} on record since ${tests[tests.length - 1].completed_at.slice(0, 4)}, ${passes.length} passed.`);
	const rate = milesPerYear(readings);
	if (rate) summary.push(`About ${rate.toLocaleString('en-GB')} miles a year, from ${readings.length} mileage readings.`);
	if (summary.length) {
		w.heading('Summary');
		for (const s of summary) w.paragraph(`•  ${s}`);
	}
	if (opts.sellerNote) {
		w.heading('From the seller');
		w.paragraph(opts.sellerNote);
	}
	w.gap(10);
	w.paragraph(
		`Prepared on ${formatDate(today)} with Glovebox. Details and service records were entered by the owner. MOT history comes from the DVSA, and you can check it yourself at www.check-mot.service.gov.uk.`,
		{ size: 8, color: MUTED }
	);

	/* ---------- mileage ---------- */
	if (opts.mileage && readings.length) {
		const asc = [...readings].reverse();
		const source = { manual: 'Owner reading', service: 'Service record', mot: 'MOT test' };
		w.heading('Mileage history');
		w.table(
			[
				{ label: 'Date', width: 1.2 },
				{ label: 'Mileage', width: 1.2, align: 'right' },
				{ label: 'From', width: 1.4 },
				{ label: '', width: 2.2 }
			],
			asc.map((r, i) => [
				formatDate(r.date),
				r.mileage.toLocaleString('en-GB'),
				source[r.source],
				i > 0 && r.mileage < asc[i - 1].mileage ? 'Lower than the reading before' : ''
			]),
			{ cellColor: (_r, c) => (c === 3 ? AMBER : undefined) }
		);
	}

	/* ---------- service history ---------- */
	if (opts.service && records.length) {
		w.heading('Service and repair history');
		const cols = [
			{ label: 'Date', width: 1.1 },
			{ label: 'Mileage', width: 0.9, align: 'right' as const },
			{ label: 'Work', width: opts.costs ? 3.6 : 4.4 },
			...(opts.costs ? [{ label: 'Cost', width: 0.8, align: 'right' as const }] : [])
		];
		w.table(
			cols,
			records.map((r) => [
				formatDate(r.date),
				r.mileage != null ? r.mileage.toLocaleString('en-GB') : '',
				workText(r, opts.notes),
				...(opts.costs ? [r.cost != null ? formatMoney(r.cost) : ''] : [])
			])
		);
		if (opts.costs) {
			const total = records.reduce((s, r) => s + (r.cost ?? 0), 0);
			if (total > 0) {
				w.gap(4);
				w.paragraph(`Total recorded: ${formatMoney(total)}`, { bold: true });
			}
		}
	}

	/* ---------- MOT history ---------- */
	if (opts.mot && tests.length) {
		w.heading('MOT history (from the DVSA)');
		w.table(
			[
				{ label: 'Date', width: 1.1 },
				{ label: 'Result', width: 0.8 },
				{ label: 'Mileage', width: 0.9, align: 'right' },
				{ label: 'Failures and advisories', width: 4.2 }
			],
			tests.map((t) => {
				const defects = JSON.parse(t.defects) as MotDefect[];
				return [
					formatDate(t.completed_at.slice(0, 10)),
					/^PASS/i.test(t.result) ? 'Pass' : 'Fail',
					t.odometer != null ? `${t.odometer.toLocaleString('en-GB')}${t.odometer_unit?.toUpperCase().startsWith('K') ? ' km' : ''}` : '',
					defects.length ? defects.map((d) => `${d.dangerous ? 'Dangerous' : sentence(d.type)}: ${d.text}`).join('\n') : 'None'
				];
			}),
			{ cellColor: (r, c) => (c === 1 ? (/^PASS/i.test(tests[r].result) ? GREEN : RED) : undefined) }
		);
		if (advisories.length) {
			w.gap(6);
			w.paragraph('Advisories from the latest MOT', { bold: true });
			w.table(
				[
					{ label: 'Advisory', width: 4.6 },
					{ label: 'Status', width: 1.6 }
				],
				advisories.map((a) => [a.text, advisoryStatus(a)]),
				{ cellColor: (r, c) => (c === 1 ? (advisories[r].status === 'fixed' ? GREEN : MUTED) : undefined) }
			);
		}
	}

	/* ---------- attachments ---------- */
	const attachments = await loadAttachments(vehicle.id, opts.docIds);
	if (attachments.length) {
		const generated = w.doc.getPageCount() + 1; // the index page below
		let next = generated + 1;
		w.newPage();
		w.text('Attached documents', PdfWriter.MARGIN, w.y, { size: 14, bold: true });
		w.gap(24);
		w.table(
			[
				{ label: 'Document', width: 4 },
				{ label: 'Page', width: 1.2, align: 'right' }
			],
			attachments.map((a) => {
				const page = a.problem ? a.problem : `${next}`;
				if (!a.problem) next += a.pages;
				return [a.doc.title, page];
			})
		);
	}

	w.footers(`${vehicle.registration} · ${makeModel} · Vehicle history`);

	for (const a of attachments) {
		if (a.problem) continue;
		if (a.pdf) {
			const pages = await w.doc.copyPages(a.pdf, a.pdf.getPageIndices());
			pages.forEach((p) => w.doc.addPage(p));
		} else if (a.bytes) {
			const img = a.doc.mime === 'image/png' ? await w.doc.embedPng(a.bytes) : await w.doc.embedJpg(a.bytes);
			w.newPage();
			w.text(a.doc.title, PdfWriter.MARGIN, w.y, { size: 12, bold: true });
			const [pw, ph] = PdfWriter.A4;
			const maxW = pw - PdfWriter.MARGIN * 2;
			const maxH = ph - PdfWriter.MARGIN * 2 - 30;
			const scale = Math.min(maxW / img.width, maxH / img.height, 1);
			const iw = img.width * scale;
			const ih = img.height * scale;
			w.page.drawImage(img, { x: PdfWriter.MARGIN + (maxW - iw) / 2, y: w.y - 16 - ih, width: iw, height: ih });
		}
	}

	w.doc.setTitle(`${vehicle.registration} vehicle history`);
	w.doc.setCreator('Glovebox');
	w.doc.setProducer('Glovebox');
	return w.doc.save();
}

async function loadAttachments(vehicleId: number, ids: number[]): Promise<Attachment[]> {
	if (!ids.length) return [];
	const docs = listDocuments(vehicleId).filter((d) => ids.includes(d.id)).reverse(); // oldest first
	const out: Attachment[] = [];
	for (const d of docs) {
		const doc = db().prepare('SELECT * FROM documents WHERE id = ?').get(d.id) as Attachment['doc'];
		if (!EMBEDDABLE.includes(doc.mime)) {
			out.push({ doc, pages: 0, problem: 'Not included (format)' });
			continue;
		}
		let bytes: Uint8Array;
		try {
			bytes = new Uint8Array(await readFile(documentPath(doc)));
		} catch {
			out.push({ doc, pages: 0, problem: 'File missing' });
			continue;
		}
		if (doc.mime !== 'application/pdf') {
			out.push({ doc, bytes, pages: 1 });
			continue;
		}
		try {
			const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
			if (pdf.isEncrypted) out.push({ doc, pages: 0, problem: 'Not included (password-protected)' });
			else out.push({ doc, pdf, pages: pdf.getPageCount() });
		} catch {
			out.push({ doc, pages: 0, problem: 'Not included (unreadable)' });
		}
	}
	return out;
}

function workText(r: ServiceRecord, notes: boolean): string {
	const head = `${recordKindLabel(r.kind)}: ${r.title}${r.garage ? ` (${r.garage})` : ''}`;
	return notes && r.notes ? `${head}\n${r.notes}` : head;
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

function advisoryStatus(a: MotAdvisory): string {
	if (a.status === 'fixed') return `Fixed${a.resolved_at ? ` ${formatDate(a.resolved_at)}` : ''}`;
	return 'Not marked as fixed';
}
