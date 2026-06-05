// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { reveal } from './reveal';

class MockIO {
	static instances: MockIO[] = [];
	cb: IntersectionObserverCallback;
	elements: Element[] = [];
	constructor(cb: IntersectionObserverCallback) {
		this.cb = cb;
		MockIO.instances.push(this);
	}
	observe(el: Element) {
		this.elements.push(el);
	}
	unobserve() {}
	disconnect() {}
	trigger(el: Element, isIntersecting: boolean) {
		this.cb(
			[{ target: el, isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

beforeEach(() => {
	MockIO.instances = [];
	vi.stubGlobal('IntersectionObserver', MockIO);
});

describe('reveal action', () => {
	it('adds the reveal class immediately and is-visible on intersect', () => {
		const el = document.createElement('div');
		reveal(el);
		expect(el.classList.contains('reveal')).toBe(true);
		expect(el.classList.contains('is-visible')).toBe(false);

		const io = MockIO.instances[0];
		io.trigger(el, true);
		expect(el.classList.contains('is-visible')).toBe(true);
	});

	it('applies a stagger delay via transition-delay', () => {
		const el = document.createElement('div');
		reveal(el, { delay: 120 });
		expect(el.style.transitionDelay).toBe('120ms');
	});

	it('does not reveal when not intersecting', () => {
		const el = document.createElement('div');
		reveal(el);
		MockIO.instances[0].trigger(el, false);
		expect(el.classList.contains('is-visible')).toBe(false);
	});
});
