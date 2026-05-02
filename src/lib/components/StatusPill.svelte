<!-- src/lib/components/StatusPill.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	type Tone = 'ok' | 'fail' | 'pending' | 'neutral';
	let { tone = 'neutral', children }: { tone?: Tone; children?: Snippet } = $props();

	const toneClasses: Record<Tone, string> = {
		ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
		fail: 'bg-red-500/15 text-red-700 dark:text-red-400',
		pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
		neutral: 'bg-neutral-500/15 text-neutral-700 dark:text-neutral-300'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-medium {toneClasses[
		tone
	]}"
>
	{@render children?.()}
</span>
