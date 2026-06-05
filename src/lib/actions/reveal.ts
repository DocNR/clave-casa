// Svelte action: reveals an element on scroll into view.
// Adds `.reveal` immediately (so it starts hidden via app.css), then
// `.is-visible` once it intersects. Unobserves after the first reveal.
// Honors reduced-motion implicitly — app.css neutralizes .reveal there.

export interface RevealOptions {
	delay?: number; // stagger, ms
	threshold?: number;
}

export function reveal(node: HTMLElement, options: RevealOptions = {}) {
	const { delay = 0, threshold = 0.1 } = options;
	node.classList.add('reveal');
	if (delay) node.style.transitionDelay = `${delay}ms`;

	// SSR / no-IO guard: reveal immediately.
	if (typeof IntersectionObserver === 'undefined') {
		node.classList.add('is-visible');
		return {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.classList.add('is-visible');
					observer.unobserve(node);
				}
			}
		},
		{ threshold }
	);
	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
