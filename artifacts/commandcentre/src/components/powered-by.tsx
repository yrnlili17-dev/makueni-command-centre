/** Shared attribution for the public site, sign-in and authenticated workspace. */
export function PoweredBy() {
  return <div className="cc-powered-by">
    <span>© {new Date().getFullYear()} Makueni Command Centre. All rights reserved.</span>
    <span className="cc-credit-separator" aria-hidden="true">·</span>
    <a href="https://github.com/l70478519-cloud/Mwathi" target="_blank" rel="noopener noreferrer" aria-label="Powered by 1Dev.co — view Mwathi on GitHub (opens in a new tab)">Powered by <strong>1Dev.co</strong></a>
  </div>;
}
