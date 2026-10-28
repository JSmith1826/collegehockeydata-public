// Encapsulated component CSS: legacy pages use broad header/nav/a rules.
export default `
:host{display:block;font-family:var(--chd-font,'Segoe UI',Arial,sans-serif);color:#173c33;background:#fff}
*{box-sizing:border-box}
[hidden]{display:none!important}
a{color:inherit;text-decoration:none}
a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid #6e9e43;outline-offset:4px}
.chd-header-row{width:100%;max-width:1440px;margin:auto;padding:0 32px;min-height:84px;display:flex;align-items:center;gap:24px}
.chd-wordmark{display:flex;flex:0 0 auto;align-items:center;margin:0;padding:0}
.chd-wordmark img{display:block;width:230px;height:44px;object-fit:contain}
.chd-primary{display:flex;align-self:stretch;align-items:center;gap:5px;margin-left:auto}
.chd-primary a,.chd-information summary{display:flex;align-items:center;min-height:46px;padding:0 12px;border-radius:6px;font-size:14px;font-weight:650;white-space:nowrap}
.chd-primary a:hover,.chd-information summary:hover,.chd-competition a:hover{background:#f1f5ee}
.chd-primary a[aria-current=page],.chd-information summary.is-current{background:#e9f0e6;color:#123b2f}
.chd-information{position:relative}
.chd-information summary{cursor:pointer;list-style:none;gap:8px}
.chd-information summary::-webkit-details-marker{display:none}
.chd-information summary::after{content:'⌄';font-size:15px}
.chd-information[open] summary::after{transform:rotate(180deg)}
.chd-information-links{position:absolute;right:0;top:calc(100% + 8px);z-index:1000;min-width:200px;padding:7px;background:#fff;border:1px solid #d5dfd8;border-radius:8px;box-shadow:0 8px 24px #173c3324}
.chd-competition{display:flex;border:1px solid #d5dfd8;padding:3px;border-radius:7px;gap:2px}
.chd-competition a{padding:10px 13px;font-size:12px;line-height:16px;font-weight:650;border-radius:4px}
.chd-competition a[aria-current=true]{color:#fff;background:#18453b}
.chd-menu-toggle{display:none;min-height:44px;padding:0 13px;background:#fff;color:#173c33;border:1px solid #d5dfd8;border-radius:6px;font:650 14px var(--chd-font,'Segoe UI',Arial,sans-serif);align-items:center;gap:9px;cursor:pointer}
.chd-section-row{max-width:1440px;padding:0 32px;margin:auto;display:flex;gap:24px;align-items:center;min-width:0}
.chd-section-row:has(>[hidden]+[hidden]){display:none}
.chd-location{display:flex;gap:10px;align-items:center;flex-shrink:0;padding:12px 0;color:#5d7369;font-size:11px}
.chd-location a:hover{text-decoration:underline}
.chd-study-tabs{padding:10px 0;display:flex;gap:5px;flex-wrap:wrap;min-width:0}
.chd-study-tabs a{display:block;font-size:12px;padding:9px 12px;border-radius:5px;background:#f5f7f3;line-height:18px}
.chd-study-tabs a[aria-current=page]{background:#18453b;color:#fff}
.chd-study-tabs a:hover{box-shadow:inset 0 0 0 1px #b8cbb4}
@media(max-width:1250px){.chd-header-row{gap:18px;padding:0 24px}.chd-wordmark img{width:205px}.chd-primary a,.chd-information summary{padding:0 10px}}
@media(max-width:1100px){
 .chd-header-row{min-height:76px;flex-wrap:wrap;gap:0 16px;padding:0 20px}
 .chd-wordmark img{width:200px;height:38px}
 .chd-menu-toggle{display:flex;margin-left:auto}
 .chd-primary,.chd-competition{display:none}
 :host(.is-open) .chd-primary{order:3;display:grid;grid-template-columns:repeat(3,1fr);flex:0 0 100%;margin:0;padding:0 0 12px}
 :host(.is-open) .chd-primary>a,:host(.is-open) .chd-information summary{justify-content:center;padding:0 8px}
 .chd-information-links{position:static;margin-top:5px;min-width:0;box-shadow:none}
 .chd-information[open]{grid-column:1/-1}
 .chd-information-links a{justify-content:center}
 :host(.is-open) .chd-competition{order:4;display:flex;margin-bottom:18px}
 .chd-section-row{display:block;padding:0 20px}
 .chd-location{padding-bottom:0}
}
@media(max-width:620px){
 :host(.is-open) .chd-primary{grid-template-columns:repeat(2,1fr)}
 .chd-study-tabs{flex-wrap:nowrap;overflow:auto;padding-bottom:12px;scrollbar-width:thin}
 .chd-study-tabs a{white-space:nowrap;flex-shrink:0}
 .chd-location{font-size:10px}
}
@media(pointer:coarse){.chd-study-tabs a{min-height:44px;display:flex;align-items:center}}
@media(max-width:380px){.chd-header-row{padding:0 16px;gap:0 8px}.chd-wordmark img{width:160px}}
`;
