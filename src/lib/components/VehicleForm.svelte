<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Vehicle } from '$lib/types';

	let {
		vehicle,
		values,
		error,
		submitLabel,
		action
	}: {
		vehicle?: Partial<Vehicle>;
		values?: Record<string, string>;
		error?: string;
		submitLabel: string;
		action?: string;
	} = $props();

	/** After a failed submit, show what the user typed; otherwise the saved vehicle. */
	const v = (key: keyof Vehicle) => values?.[key] ?? vehicle?.[key] ?? '';

	let busy = $state(false);
	const fuels = ['Petrol', 'Diesel', 'Hybrid', 'Plug-in hybrid', 'Electric', 'LPG'];
</script>

<form
	method="POST"
	{action}
	class="space-y-6"
	use:enhance={() => {
		busy = true;
		return async ({ update }) => {
			await update({ reset: false });
			busy = false;
		};
	}}
>
	{#if error}<p class="alert-error" role="alert">{error}</p>{/if}

	<section class="card p-6">
		<h2 class="section-title">Vehicle</h2>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="registration">Registration <span class="text-red-500">*</span></label>
				<input class="input font-semibold uppercase" id="registration" name="registration" required maxlength="16" placeholder="AB12 CDE" value={v('registration')} />
			</div>
			<div>
				<label class="label" for="nickname">Nickname</label>
				<input class="input" id="nickname" name="nickname" maxlength="60" placeholder="e.g. The van" value={v('nickname')} />
			</div>
			<div>
				<label class="label" for="make">Make</label>
				<input class="input" id="make" name="make" placeholder="e.g. Volkswagen" value={v('make')} />
			</div>
			<div>
				<label class="label" for="model">Model</label>
				<input class="input" id="model" name="model" placeholder="e.g. Golf GTI" value={v('model')} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="label" for="year">Year</label>
					<input class="input" id="year" name="year" inputmode="numeric" maxlength="4" value={v('year')} />
				</div>
				<div>
					<label class="label" for="colour">Colour</label>
					<input class="input" id="colour" name="colour" value={v('colour')} />
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="label" for="fuel_type">Fuel</label>
					<input class="input" id="fuel_type" name="fuel_type" list="fuels" value={v('fuel_type')} />
					<datalist id="fuels">{#each fuels as f}<option value={f}></option>{/each}</datalist>
				</div>
				<div>
					<label class="label" for="engine_cc">Engine (cc)</label>
					<input class="input" id="engine_cc" name="engine_cc" inputmode="numeric" value={v('engine_cc')} />
				</div>
			</div>
			<div>
				<label class="label" for="mileage">Current mileage</label>
				<input class="input" id="mileage" name="mileage" inputmode="numeric" value={v('mileage')} />
			</div>
			<div>
				<label class="label" for="vin">VIN / chassis number</label>
				<input class="input uppercase" id="vin" name="vin" maxlength="32" value={v('vin')} />
			</div>
		</div>
	</section>

	<section class="card p-6">
		<h2 class="section-title">Handy to know</h2>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="tyre_size">Tyre size</label>
				<input class="input" id="tyre_size" name="tyre_size" placeholder="e.g. 225/40 R18 92Y" value={v('tyre_size')} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="label" for="tyre_pressure_front">Pressure front</label>
					<input class="input" id="tyre_pressure_front" name="tyre_pressure_front" placeholder="36 psi" value={v('tyre_pressure_front')} />
				</div>
				<div>
					<label class="label" for="tyre_pressure_rear">Pressure rear</label>
					<input class="input" id="tyre_pressure_rear" name="tyre_pressure_rear" placeholder="33 psi" value={v('tyre_pressure_rear')} />
				</div>
			</div>
			<div>
				<label class="label" for="oil_spec">Oil spec</label>
				<input class="input" id="oil_spec" name="oil_spec" placeholder="e.g. 5W-30 VW 504.00" value={v('oil_spec')} />
			</div>
			<div>
				<label class="label" for="locking_wheel_nut_code">Locking wheel nut code</label>
				<input class="input" id="locking_wheel_nut_code" name="locking_wheel_nut_code" value={v('locking_wheel_nut_code')} />
			</div>
			<div>
				<label class="label" for="key_code">Key code</label>
				<input class="input" id="key_code" name="key_code" value={v('key_code')} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="label" for="purchase_date">Bought on</label>
					<input class="input" id="purchase_date" name="purchase_date" type="date" value={v('purchase_date')} />
				</div>
				<div>
					<label class="label" for="purchase_price">Price (£)</label>
					<input class="input" id="purchase_price" name="purchase_price" inputmode="decimal" value={v('purchase_price')} />
				</div>
			</div>
			<div class="sm:col-span-2">
				<label class="label" for="notes">Notes</label>
				<textarea class="input min-h-24" id="notes" name="notes" rows="3">{v('notes')}</textarea>
			</div>
		</div>
	</section>

	<div class="flex justify-end gap-3">
		<a href={vehicle?.id ? `/vehicles/${vehicle.id}` : '/'} class="btn-ghost">Cancel</a>
		<button class="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
	</div>
</form>
