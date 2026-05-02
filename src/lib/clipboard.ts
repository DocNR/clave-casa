// Cross-context clipboard copy. The modern Async Clipboard API
// (`navigator.clipboard.writeText`) requires a secure context (HTTPS or
// localhost), which excludes our dev-server-on-LAN-IP setup
// (http://192.168.x.x:5173). Falls back to the deprecated-but-still-
// universally-supported `document.execCommand('copy')` when needed.

export async function copyToClipboard(text: string): Promise<boolean> {
	// Modern API: secure context required.
	if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// Some browsers throw NotAllowedError without user gesture even
			// in secure contexts — fall through to the legacy path.
		}
	}

	// Legacy fallback: invisible textarea + execCommand('copy').
	if (typeof document === 'undefined') return false;
	const ta = document.createElement('textarea');
	ta.value = text;
	// Avoid scrolling-into-view on mobile.
	ta.style.position = 'fixed';
	ta.style.top = '0';
	ta.style.left = '0';
	ta.style.width = '1px';
	ta.style.height = '1px';
	ta.style.padding = '0';
	ta.style.border = 'none';
	ta.style.outline = 'none';
	ta.style.boxShadow = 'none';
	ta.style.background = 'transparent';
	ta.style.opacity = '0';
	ta.setAttribute('readonly', '');
	document.body.appendChild(ta);
	try {
		ta.focus();
		ta.select();
		ta.setSelectionRange(0, text.length);
		const ok = document.execCommand('copy');
		return ok;
	} catch {
		return false;
	} finally {
		document.body.removeChild(ta);
	}
}
