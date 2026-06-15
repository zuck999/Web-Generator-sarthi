import { WebContainer } from '@webcontainer/api';
import { useEffect, useState, useRef } from 'react';

interface PreviewFrameProps {
  webContainer: WebContainer;
  files?: { name: string; path?: string; content?: string }[];
}

function findFileContent(files: any[] | undefined, filename: string): string | null {
  if (!files) return null;
  for (const f of files) {
    if (f.type === 'file' && f.name === filename) return f.content || null;
    if (f.type === 'folder' && f.children) {
      const found = findFileContent(f.children, filename);
      if (found) return found;
    }
  }
  return null;
}

export function PreviewFrame({ webContainer, files }: PreviewFrameProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle');
  const startedRef = useRef(false);

  useEffect(() => {
    // If we already started the dev server in this component lifecycle, don't restart.
    if (!webContainer || startedRef.current) return;

    // Quick static preview: if an index.html is present in the file tree, show it
    const indexHtml = findFileContent(files, 'index.html');
    if (indexHtml) {
      const blob = new Blob([indexHtml], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      setUrl(blobUrl);
      setStatus('static-preview');
    }

    async function startServer() {
      try {
        setStatus('starting');

        // Start install only once per session: if node_modules already exists, skip install.
        // Use a shell test to check for directory presence; keep logs minimal.
        const check = await webContainer.spawn('bash', ['-lc', 'if [ -d node_modules ]; then echo ok; fi']);
        let exists = false;
        try {
          await check.output.pipeTo(new WritableStream({
            write(chunk) {
              if (String(chunk).includes('ok')) exists = true;
            }
          }));
        } catch {
          // ignore stream errors
        }

        if (!exists) {
          setStatus('installing');
          const installProc = await webContainer.spawn('npm', ['install', '--silent']);
          // pipe minimal logs to console
          installProc.output.pipeTo(new WritableStream({
            write(data) {
              // keep small logs so user knows progress
              console.log('[webcontainer] ', String(data).slice(0, 200));
            }
          }));
          await installProc.exit;
        }

        setStatus('running');
        const devProc = await webContainer.spawn('npm', ['run', 'dev']);

        // Listen for vite/server ready event from webcontainer
        webContainer.on('server-ready', (_port, serverUrl) => {
          startedRef.current = true;
          setUrl(serverUrl);
          setStatus('ready');
        });

        // Keep process output small in console
        devProc.output.pipeTo(new WritableStream({
          write(d) {
            // no-op or small log
            // console.debug('[dev]', String(d).slice(0, 200));
          }
        }));
      } catch (err) {
        console.error('Preview start failed', err);
        setStatus('error');
      }
    }

    startServer();

    // Cleanup blob URL when component unmounts or URL changes away from blob
    return () => {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    };
  }, [webContainer, files]);

  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {status !== 'ready' && (
        <div className="text-center">
          <p className="mb-2">{status === 'static-preview' ? 'Showing static preview' : status === 'installing' ? 'Installing dependencies...' : status === 'starting' || status === 'running' ? 'Starting preview server...' : status === 'error' ? 'Preview failed to start' : 'Preparing preview...'}</p>
        </div>
      )}
      {url && <iframe width={"100%"} height={"100%"} src={url} />}
    </div>
  );
}
