<!-- src/lib/components/marketing/EditorMockup.svelte
     Non-interactive product preview for section 4 of the marketing
     landing. Uses real Avatar + FormSectionCard components rendering
     placeholder content so the visual matches the actual /edit page
     byte-for-byte where the same components are reused.

     Decorative: pointer-events disabled, aria-hidden, button has
     tabindex=-1 so it stays out of the keyboard tab order.

     Post-deploy follow-up: replace this entire component with an
     <img src="/og/editor-screenshot.png" /> once we have a real
     screenshot we like. -->
<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import FormSectionCard from '$lib/components/FormSectionCard.svelte';
	import { DEMO_PUBKEY } from '$lib/marketing';
</script>

<div class="pointer-events-none select-none" aria-hidden="true">
	<FormSectionCard>
		<div class="flex items-center gap-3">
			<Avatar pubkey={DEMO_PUBKEY} size="lg" label="Daisy" />
			<div class="min-w-0">
				<div class="truncate text-base font-semibold" style="color: var(--clave-text)">
					Daisy
				</div>
				<div class="truncate font-mono text-[11px]" style="color: var(--clave-text-muted)">
					npub1xy54p83…6411
				</div>
			</div>
		</div>

		<div class="block">
			<span class="text-sm font-semibold" style="color: var(--clave-text)">Display name</span>
			<div
				class="mt-1.5 rounded-xl border px-3.5 py-2.5 text-sm"
				style="border-color: var(--clave-border); background: var(--clave-surface-alt); color: var(--clave-text)"
			>
				Daisy
			</div>
		</div>

		<div class="block">
			<span class="text-sm font-semibold" style="color: var(--clave-text)">About</span>
			<div
				class="mt-1.5 rounded-xl border px-3.5 py-2.5 text-sm"
				style="border-color: var(--clave-border); background: var(--clave-surface-alt); color: var(--clave-text-muted)"
			>
				A short bio about your work on Nostr.
			</div>
		</div>

		<button
			type="button"
			tabindex={-1}
			class="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
			style="background: var(--clave-tint); color: var(--clave-tint-fg)"
		>
			Save and publish
		</button>
	</FormSectionCard>
</div>
