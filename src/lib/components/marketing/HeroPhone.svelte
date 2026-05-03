<!-- src/lib/components/marketing/HeroPhone.svelte
     Stylized iPhone-with-approval-sheet visual for the marketing hero.
     Inline SVG outline + foreignObject for the inner sheet so the sheet
     uses real CSS-var surface tokens (matches the live app chrome).
     Decorative; aria-hidden. Replace with the Clave app icon SVG once
     available — see BACKLOG. -->
<script lang="ts">
	// No props — purely presentational.
</script>

<svg
	viewBox="0 0 220 440"
	class="block h-auto w-full max-w-[260px] text-[var(--clave-text-muted)]"
	aria-hidden="true"
>
	<!-- iPhone outline -->
	<rect
		x="3"
		y="3"
		width="214"
		height="434"
		rx="34"
		ry="34"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		opacity="0.5"
	/>
	<!-- Dynamic Island -->
	<rect x="80" y="16" width="60" height="14" rx="7" fill="currentColor" opacity="0.4" />

	<!-- Approval sheet rendered as foreignObject so we can use HTML +
	     CSS-var styling identical to the real app chrome. -->
	<foreignObject x="22" y="80" width="176" height="320">
		<div
			xmlns="http://www.w3.org/1999/xhtml"
			class="rounded-2xl border bg-[var(--clave-surface-alt)] p-4 shadow-sm"
			style="border-color: var(--clave-border); color: var(--clave-text)"
		>
			<div
				class="text-[10px] font-semibold uppercase tracking-wide"
				style="color: var(--clave-text-muted)"
			>
				Sign event from
			</div>
			<div class="mt-1 font-mono text-xs font-semibold" style="color: var(--clave-text)">
				clave.casa
			</div>

			<hr class="my-3" style="border-color: var(--clave-border)" />

			<div class="text-[10px] leading-relaxed" style="color: var(--clave-text-muted)">
				kind:1 note · signed locally on your device
			</div>

			<div class="mt-4 flex flex-col gap-1.5">
				<div
					class="rounded-xl py-2 text-center text-xs font-semibold"
					style="background: var(--clave-tint); color: var(--clave-tint-fg)"
				>
					Sign
				</div>
				<div
					class="rounded-xl border py-2 text-center text-xs font-semibold"
					style="border-color: var(--clave-border); color: var(--clave-text-muted)"
				>
					Decline
				</div>
			</div>
		</div>
	</foreignObject>
</svg>
