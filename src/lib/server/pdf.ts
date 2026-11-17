/**
 * A small layout helper on top of pdf-lib: headings, wrapped text, key/value
 * lists and tables that break across pages, with a footer on every page.
 * Uses the built-in Helvetica fonts, so text is limited to Windows-1252.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from 'pdf-lib';

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const FOOTER = 28;

export const INK = rgb(0.09, 0.09, 0.11);
export const MUTED = rgb(0.44, 0.44, 0.48);
export const RULE = rgb(0.86, 0.86, 0.88);
export const GREEN = rgb(0.02, 0.59, 0.41);
export const RED = rgb(0.86, 0.15, 0.15);
export const AMBER = rgb(0.85, 0.47, 0.02);
export const PLATE = rgb(0.97, 0.78, 0);

/** Map characters Helvetica can't draw to close equivalents. */
export function clean(s: string): string {
	return s
		.replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
		.replace(/→/g, '->')
		.replace(/[‐-‒]/g, '-')
		.replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff‘’‚“”„•–—…€™ŠšŒœŽžŸƒˆ˜‰‹›†‡]/g, '?');
}

export interface Column {
	label: string;
	/** Share of the table width. */
	width: number;
	align?: 'left' | 'right';
}

export class PdfWriter {
	doc!: PDFDocument;
	font!: PDFFont;
	bold!: PDFFont;
	page!: PDFPage;
	y = 0;
	readonly width = A4[0] - MARGIN * 2;

	static async create(): Promise<PdfWriter> {
		const w = new PdfWriter();
		w.doc = await PDFDocument.create();
		w.font = await w.doc.embedFont(StandardFonts.Helvetica);
		w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold);
		w.newPage();
		return w;
	}

	newPage() {
		this.page = this.doc.addPage(A4);
		this.y = A4[1] - MARGIN;
	}

	/** Start a new page if fewer than `h` points are left. */
	ensure(h: number) {
		if (this.y - h < MARGIN + FOOTER) this.newPage();
	}

	gap(h: number) {
		this.y -= h;
	}

	text(s: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: RGB } = {}) {
		this.page.drawText(clean(s), {
			x,
			y,
			size: opts.size ?? 10,
			font: opts.bold ? this.bold : this.font,
			color: opts.color ?? INK
		});
	}

	measure(s: string, size = 10, bold = false): number {
		return (bold ? this.bold : this.font).widthOfTextAtSize(clean(s), size);
	}

	/** Split text into lines that fit `width`. Very long words are broken. */
	wrap(s: string, width: number, size = 10, bold = false): string[] {
		const out: string[] = [];
		for (const para of clean(s).split(/\r?\n/)) {
			let line = '';
			for (const word of para.split(/\s+/).filter(Boolean)) {
				const next = line ? `${line} ${word}` : word;
				if (this.measure(next, size, bold) <= width) {
					line = next;
					continue;
				}
				if (line) out.push(line);
				line = word;
				while (this.measure(line, size, bold) > width && line.length > 1) {
					let cut = line.length - 1;
					while (cut > 1 && this.measure(line.slice(0, cut), size, bold) > width) cut--;
					out.push(line.slice(0, cut));
					line = line.slice(cut);
				}
			}
			out.push(line);
		}
		return out;
	}

	heading(s: string, size = 14) {
		this.ensure(size + 40);
		this.gap(size + 8);
		this.text(s, MARGIN, this.y, { size, bold: true });
		this.gap(8);
		this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: MARGIN + this.width, y: this.y }, thickness: 0.8, color: RULE });
		this.gap(14);
	}

	paragraph(s: string, opts: { size?: number; color?: RGB; bold?: boolean } = {}) {
		const size = opts.size ?? 10;
		for (const line of this.wrap(s, this.width, size, opts.bold)) {
			this.ensure(size + 4);
			this.text(line, MARGIN, this.y, { size, color: opts.color, bold: opts.bold });
			this.gap(size + 4);
		}
	}

	/** Two-column label / value list. */
	facts(rows: [string, string][], labelWidth = 150) {
		for (const [label, value] of rows) {
			const lines = this.wrap(value, this.width - labelWidth, 10);
			this.ensure(lines.length * 14 + 4);
			this.text(label, MARGIN, this.y, { color: MUTED });
			lines.forEach((l, i) => this.text(l, MARGIN + labelWidth, this.y - i * 14, { bold: i === 0 && lines.length === 1 }));
			this.gap(lines.length * 14 + 4);
		}
	}

	/** A table with a repeated header row. Cells wrap; a row never splits across pages. */
	table(columns: Column[], rows: string[][], opts: { size?: number; cellColor?: (row: number, col: number) => RGB | undefined } = {}) {
		const size = opts.size ?? 9;
		const pad = 4;
		const total = columns.reduce((s, c) => s + c.width, 0);
		const widths = columns.map((c) => (c.width / total) * this.width);
		const xs = widths.map((_, i) => MARGIN + widths.slice(0, i).reduce((s, w) => s + w, 0));
		const lineH = size + 3;

		const header = () => {
			this.ensure(lineH * 3);
			this.page.drawRectangle({ x: MARGIN, y: this.y - 5, width: this.width, height: lineH + 6, color: rgb(0.96, 0.96, 0.97) });
			columns.forEach((c, i) => {
				const x = c.align === 'right' ? xs[i] + widths[i] - pad - this.measure(c.label, size, true) : xs[i] + pad;
				this.text(c.label, x, this.y, { size, bold: true, color: MUTED });
			});
			this.gap(lineH + 8);
		};

		header();
		rows.forEach((row, r) => {
			const cells = row.map((cell, i) => this.wrap(cell ?? '', widths[i] - pad * 2, size));
			const h = Math.max(...cells.map((c) => c.length)) * lineH + 6;
			if (this.y - h < MARGIN + FOOTER) {
				this.newPage();
				header();
			}
			cells.forEach((lines, i) => {
				lines.forEach((l, j) => {
					const x = columns[i].align === 'right' ? xs[i] + widths[i] - pad - this.measure(l, size) : xs[i] + pad;
					this.text(l, x, this.y - j * lineH, { size, color: opts.cellColor?.(r, i) ?? INK });
				});
			});
			this.gap(h - 3);
			this.page.drawLine({ start: { x: MARGIN, y: this.y + 4 }, end: { x: MARGIN + this.width, y: this.y + 4 }, thickness: 0.4, color: RULE });
			this.gap(3);
		});
	}

	/** "<left>   Page n of N" on every page. Call once, at the end. */
	footers(left: string) {
		const pages = this.doc.getPages();
		pages.forEach((p, i) => {
			const right = `Page ${i + 1} of ${pages.length}`;
			p.drawText(clean(left), { x: MARGIN, y: MARGIN - 16, size: 8, font: this.font, color: MUTED });
			p.drawText(right, { x: A4[0] - MARGIN - this.font.widthOfTextAtSize(right, 8), y: MARGIN - 16, size: 8, font: this.font, color: MUTED });
		});
	}

	static readonly MARGIN = MARGIN;
	static readonly A4 = A4;
}
