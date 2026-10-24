import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vyrexo",
  description:
    "Voice-first conversational AI coding assistant with real-time agent workflow, speech synthesis, and live preview",
  openGraph: {
    title: "Vyrexo",
    description:
      "Voice-first conversational AI coding assistant with real-time agent workflow, speech synthesis, and live preview",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint and auto-recover from transient dev ChunkLoadErrors */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('vyrexo_theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}" +
              "function isRawDomEvent(obj){if(!obj||typeof obj!=='object')return false;if(typeof Event!=='undefined'&&obj instanceof Event&&!(typeof ErrorEvent!=='undefined'&&obj instanceof ErrorEvent&&obj.error))return true;if('isTrusted' in obj&&!obj.message&&!obj.stack&&!obj.error)return true;return false;}" +
              "function handleChunkErr(msg){if(!msg)return false;var s=String(msg);if(s.indexOf('ChunkLoadError')!==-1||s.indexOf('Loading chunk')!==-1||s.indexOf('failed to fetch dynamically imported module')!==-1){try{var k='vyrexo_chunk_reload_ts';var last=Number(sessionStorage.getItem(k)||'0');var now=Date.now();if(now-last>6000){sessionStorage.setItem(k,String(now));setTimeout(function(){window.location.reload();},250);}}catch(e){}return true;}return false;}" +
              "window.addEventListener('error',function(ev){if(!ev)return;if(isRawDomEvent(ev)||isRawDomEvent(ev.error)){ev.preventDefault();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();return;}if(handleChunkErr(ev&&(ev.message||(ev.error&&ev.error.message)||(ev.error&&ev.error.name)))){ev.preventDefault();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}},true);" +
              "window.addEventListener('unhandledrejection',function(ev){var r=ev&&ev.reason;if(!r||isRawDomEvent(r)||(r&&(r.name==='AbortError'||r.name==='NotAllowedError'))){if(ev){ev.preventDefault();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}return;}if(handleChunkErr(r&&(r.message||r.name||String(r)))){ev.preventDefault();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}},true);" +
              "var origErr=console.error;console.error=function(){var args=Array.prototype.slice.call(arguments);if(args.some(function(a){return isRawDomEvent(a)||(typeof a==='string'&&a.indexOf('{\"isTrusted\":true}')!==-1);})){return;}return origErr.apply(console,args);};" +
              "})();",
          }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
