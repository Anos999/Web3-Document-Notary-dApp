import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getHealthCheckQueryKey, useHealthCheck, useUploadDocument } from '@workspace/api-client-react';
import { BrowserProvider, Contract } from 'ethers';
import { AlertCircle, ArrowRight, Check, CheckCircle2, CloudUpload, Copy, ExternalLink, FileCheck2, FileText, Fingerprint, Hash, Info, Loader2, LockKeyhole, Menu, Network, RefreshCw, ShieldCheck, Upload, Wallet, X } from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

type WalletState = { address: string; chainId: string; network: string; connected: boolean; connecting: boolean };
type Verification = { found: boolean; owner?: string; timestamp?: string; description?: string; ipfsCID?: string; hash: string; tx?: string };
type LedgerEntry = { hash: string; owner: string; timestamp: string; description: string; ipfsCID: string; tx: string };
type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (event: string, cb: (...args: unknown[]) => void) => void; removeListener?: (event: string, cb: (...args: unknown[]) => void) => void };

declare global { interface Window { ethereum?: EthereumProvider } }

const queryClient = new QueryClient();
const CONTRACT_ADDRESS = import.meta.env.VITE_NOTARY_CONTRACT_ADDRESS as string | undefined;
const LOCAL_CONTRACT_ADDRESS = import.meta.env.VITE_NOTARY_CONTRACT_ADDRESS_LOCAL as string | undefined;
const SEPOLIA_CONTRACT_ADDRESS = import.meta.env.VITE_NOTARY_CONTRACT_ADDRESS_SEPOLIA as string | undefined;
const networkNames: Record<string, string> = { '1': 'Ethereum', '11155111': 'Sepolia', '137': 'Polygon', '10': 'Optimism', '8453': 'Base', '42161': 'Arbitrum' };
const SUPPORTED_CHAINS = new Set(['31337', '11155111']);
const EXPECTED_CHAIN = (import.meta.env.VITE_EXPECTED_CHAIN_ID as string | undefined) ?? '11155111';
const NOTARY_ABI = [
  'function notarize(bytes32 docHash, string description, string ipfsCID)',
  'function verify(bytes32 docHash) view returns (bool)',
  'function getNotarization(bytes32 docHash) view returns (address owner, uint256 timestamp, string description, string ipfsCID)',
  'event DocumentNotarized(bytes32 indexed docHash, address indexed owner, uint256 timestamp, string description, string ipfsCID)',
];

function shortAddress(address: string) { return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''; }
function shortHash(hash: string) { return `${hash.slice(0, 18)}…${hash.slice(-12)}`; }
function formatBytes(bytes: number) { if (!bytes) return '0 B'; const units = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(1024)); return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`; }
function formatDate(date = new Date()) { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date); }
function encodeHash(hash: string) { return hash.replace(/^0x/, '').padStart(64, '0'); }
function addressForChain(chainId: string) { return chainId === '31337' ? LOCAL_CONTRACT_ADDRESS || CONTRACT_ADDRESS : chainId === '11155111' ? SEPOLIA_CONTRACT_ADDRESS || CONTRACT_ADDRESS : undefined; }
function providerForWallet() { if (!window.ethereum) throw new Error('wallet-unavailable'); return new BrowserProvider(window.ethereum as never); }
function contractForChain(chainId: string, signerOrProvider: unknown) { const address = addressForChain(chainId); if (!address) throw new Error('contract-not-configured'); return new Contract(address, NOTARY_ABI, signerOrProvider); }
function transactionProof(hash: string, chainId: string) { return chainId === '11155111' ? `https://sepolia.etherscan.io/tx/${hash}` : ''; }

async function digestFile(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return `0x${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function rpc(provider: EthereumProvider, method: string, params: unknown[] = []) {
  return provider.request({ method, params });
}

function Brand() {
  return <Link href="/" className="flex items-center gap-3 group" data-testid="link-brand">
    <span className="brand-mark grid h-9 w-9 place-items-center rounded-xl text-[hsl(var(--foreground))] transition-transform group-hover:rotate-6"><Fingerprint size={20} strokeWidth={2.4} /></span>
    <span className="leading-none"><span className="block font-serif text-[1.35rem] tracking-tight">Proofmark</span><span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[.23em] text-[hsl(var(--muted-foreground))]">document notary</span></span>
  </Link>;
}

function WalletButton({ wallet, connect }: { wallet: WalletState; connect: () => void }) {
  return <button onClick={connect} disabled={wallet.connecting} className="group flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.55)] hover:shadow-md disabled:opacity-60" data-testid="button-connect-wallet">
    <span className={`grid h-6 w-6 place-items-center rounded-full ${wallet.connected ? 'bg-[hsl(var(--primary)/.17)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}><Wallet size={13} /></span>
    <span>{wallet.connecting ? 'Connecting…' : wallet.connected ? shortAddress(wallet.address) : 'Connect wallet'}</span>
    {wallet.connected && <span className={`h-1.5 w-1.5 rounded-full ${wallet.chainId === EXPECTED_CHAIN ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent))]'}`} />}
  </button>;
}

function Shell({ children, wallet, connect }: { children: React.ReactNode; wallet: WalletState; connect: () => void }) {
  const [menu, setMenu] = useState(false);
  const [location] = useLocation();
  return <div className="app-noise min-h-[100dvh]">
    <header className="relative z-30 border-b border-[hsl(var(--border)/.68)] bg-[hsl(var(--background)/.82)] backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          <Link href="/" className={`rounded-full px-4 py-2 text-sm transition-colors ${location === '/' ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="link-notarize">Notarize</Link>
          <Link href="/verify" className={`rounded-full px-4 py-2 text-sm transition-colors ${location === '/verify' ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`} data-testid="link-verify">Verify</Link>
        </nav>
        <div className="flex items-center gap-2"><WalletButton wallet={wallet} connect={connect} /><button className="grid h-9 w-9 place-items-center rounded-full border border-[hsl(var(--border))] md:hidden" onClick={() => setMenu(!menu)} aria-label="Open menu" data-testid="button-open-menu"><Menu size={17} /></button></div>
      </div>
      {menu && <div className="border-t border-[hsl(var(--border))] px-5 py-3 md:hidden"><div className="flex gap-2"><Link onClick={() => setMenu(false)} href="/" className="flex-1 rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-center text-sm" data-testid="link-mobile-notarize">Notarize</Link><Link onClick={() => setMenu(false)} href="/verify" className="flex-1 rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-center text-sm" data-testid="link-mobile-verify">Verify</Link></div></div>}
    </header>
    <main>{children}</main>
    <footer className="mx-auto flex max-w-[1200px] flex-col gap-3 border-t border-[hsl(var(--border)/.7)] px-5 py-8 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-mono uppercase tracking-[.16em]">Proofmark / a quiet record of existence</span><span className="flex items-center gap-2"><LockKeyhole size={13} />Files stay in your browser by default.</span></footer>
  </div>;
}

function WalletNotice({ wallet, connect }: { wallet: WalletState; connect: () => void }) {
  if (!wallet.connected) return <div className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--accent)/.5)] bg-[hsl(var(--accent)/.13)] p-4 text-sm"><Wallet className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" size={18} /><div className="flex-1"><p className="font-semibold">Connect your wallet to publish</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Hashing is available now. A wallet is only needed when you submit the proof on-chain.</p></div><button onClick={connect} className="shrink-0 rounded-lg bg-[hsl(var(--foreground))] px-3 py-2 text-xs font-semibold text-[hsl(var(--background))]" data-testid="button-notice-connect">Connect</button></div>;
  if (!SUPPORTED_CHAINS.has(wallet.chainId)) return <div className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--accent)/.62)] bg-[hsl(var(--accent)/.13)] p-4 text-sm"><Network className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" size={18} /><div><p className="font-semibold">Unsupported network</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Switch to Hardhat Local or Sepolia. You are connected to {wallet.network}.</p></div></div>;
  return <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--primary)/.28)] bg-[hsl(var(--primary)/.07)] p-4 text-sm"><span className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--primary)/.14)] text-[hsl(var(--primary))]"><Check size={16} /></span><div><p className="font-semibold">Ready to notarize on {wallet.network}</p><p className="mt-1 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">{wallet.address}</p></div></div>;
}

function StepRail({ active }: { active: number }) {
  const steps = [['01', 'Select', 'Choose a local file'], ['02', 'Fingerprint', 'Create its SHA-256'], ['03', 'Publish', 'Anchor it on-chain']];
  return <div className="hidden w-[184px] shrink-0 pt-1 lg:block">{steps.map(([num, title, copy], i) => <div className="relative flex gap-3 pb-9" key={num}><div className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${i < active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : i === active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}>{i < active ? <Check size={13} /> : num}</div><div><p className={`text-sm font-semibold ${i === active ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>{title}</p><p className="mt-1 text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">{copy}</p></div>{i < 2 && <span className={`absolute left-[15px] top-8 h-[calc(100%-18px)] w-px ${i < active ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--border))]'}`} />}</div>)}</div>;
}

function FileDrop({ file, onFile }: { file: File | null; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return <div onDragOver={(event) => { event.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(event) => { event.preventDefault(); setDrag(false); const dropped = event.dataTransfer.files[0]; if (dropped) onFile(dropped); }} onClick={() => inputRef.current?.click()} className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all sm:p-12 ${drag ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)]' : file ? 'border-[hsl(var(--primary)/.45)] bg-[hsl(var(--primary)/.05)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card)/.45)] hover:border-[hsl(var(--primary)/.55)] hover:bg-[hsl(var(--card))]'}`} data-testid="dropzone-document">
    <input ref={inputRef} type="file" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) onFile(selected); }} data-testid="input-document-file" />
    <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl transition-transform group-hover:-translate-y-1 ${file ? 'bg-[hsl(var(--primary)/.14)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{file ? <FileCheck2 size={25} /> : <Upload size={25} strokeWidth={1.6} />}</div>
    {file ? <><p className="mt-4 truncate px-4 font-semibold">{file.name}</p><p className="mt-1 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">{formatBytes(file.size)} / ready to fingerprint</p><button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }} className="mt-4 text-xs font-semibold text-[hsl(var(--primary))] underline-offset-4 hover:underline" data-testid="button-change-file">Choose another file</button></> : <><p className="mt-4 font-semibold">Drop a document here</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">or <span className="font-semibold text-[hsl(var(--primary))]">browse your device</span></p><p className="mt-4 font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Nothing leaves your browser</p></>}
  </div>;
}

function HashCard({ hash, hashing }: { hash: string; hashing: boolean }) {
  if (hashing) return <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.45)] p-4"><div className="flex items-center gap-2 text-sm font-semibold"><Loader2 className="animate-spin text-[hsl(var(--primary))]" size={16} />Reading local fingerprint…</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[hsl(var(--border))]"><div className="scan-line h-full w-1/3 rounded-full bg-[hsl(var(--primary))]" /></div></div>;
  if (!hash) return null;
  return <div className="enter rounded-2xl border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.06)] p-4" data-testid="status-hash-ready"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Check size={13} /></span>Fingerprint created</div><button onClick={() => navigator.clipboard?.writeText(hash)} className="rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary)/.12)] hover:text-[hsl(var(--foreground))]" aria-label="Copy hash" data-testid="button-copy-hash"><Copy size={14} /></button></div><p className="mt-3 break-all font-mono text-[11px] leading-5 text-[hsl(var(--muted-foreground))]" data-testid="text-document-hash">{hash}</p><p className="mt-3 flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]"><LockKeyhole size={12} />SHA-256 · calculated locally</p></div>;
}

function SuccessCard({ hash, tx, description, chainId, cid }: { hash: string; tx?: string; description: string; chainId: string; cid: string }) {
  const proofUrl = tx ? transactionProof(tx, chainId) : '';
  return <div className="enter rounded-2xl border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--primary)/.08)] p-5" data-testid="status-notarized"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><CheckCircle2 size={19} /></span><div><p className="font-semibold">Proof published</p><p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">Your document now has a verifiable timestamp on {networkNames[chainId] || `chain ${chainId}`}.</p></div></div><div className="mt-5 grid gap-3 border-t border-[hsl(var(--primary)/.18)] pt-4 text-xs sm:grid-cols-2"><div><p className="uppercase tracking-widest text-[10px] text-[hsl(var(--muted-foreground))]">Document</p><p className="mt-1 font-mono">{shortHash(hash)}</p></div><div><p className="uppercase tracking-widest text-[10px] text-[hsl(var(--muted-foreground))]">Description</p><p className="mt-1 truncate">{description || 'Untitled document'}</p></div></div>{cid && <a className="mt-4 mr-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))] hover:underline" href={`https://gateway.pinata.cloud/ipfs/${cid}`} target="_blank" rel="noreferrer">Open IPFS copy <ExternalLink size={13} /></a>}{tx && (proofUrl ? <a className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))] hover:underline" href={proofUrl} target="_blank" rel="noreferrer" data-testid="link-transaction-proof">View transaction proof <ExternalLink size={13} /></a> : <p className="mt-4 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">Transaction: {tx}</p>)}</div>;
}

function Notarize() {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState('');
  const [hashing, setHashing] = useState(false);
  const [description, setDescription] = useState('');
  const [ipfs, setIpfs] = useState(false);
  const [ipfsFallback, setIpfsFallback] = useState(false);
  const [txState, setTxState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [tx, setTx] = useState('');
  const [cid, setCid] = useState('');
  const [error, setError] = useState('');
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const upload = useUploadDocument();
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 30000 } });
  const [wallet, walletControls] = useWalletContext();
  const setSelectedFile = async (next: File) => { setFile(next); setHash(''); setTxState('idle'); setError(''); setHashing(true); try { setHash(await digestFile(next)); } catch { setError('Could not read this file. Please try again.'); } finally { setHashing(false); } };
  const loadLedger = async () => {
    if (!wallet.chainId || !addressForChain(wallet.chainId) || !window.ethereum) { setLedger([]); return; }
    try {
      const contract = contractForChain(wallet.chainId, providerForWallet());
      const events = await contract.queryFilter(contract.filters.DocumentNotarized());
      setLedger(events.reverse().map((event) => {
        const args = (event as { args?: Record<string, unknown> }).args;
        const timestamp = Number(args?.timestamp ?? 0);
        return {
          hash: String(args?.docHash ?? ''),
          owner: String(args?.owner ?? ''),
          timestamp: timestamp ? formatDate(new Date(timestamp * 1000)) : 'Unknown date',
          description: String(args?.description ?? ''),
          ipfsCID: String(args?.ipfsCID ?? ''),
          tx: String((event as { transactionHash?: string }).transactionHash ?? ''),
        };
      }));
    } catch {
      setLedger([]);
    }
  };
  useEffect(() => { void loadLedger(); }, [wallet.chainId, wallet.connected]);
  const submit = async () => {
    if (!hash || !wallet.connected) return;
    if (!SUPPORTED_CHAINS.has(wallet.chainId)) { setError('Switch to Hardhat Local or Sepolia before publishing.'); return; }
    setTxState('pending'); setError(''); setIpfsFallback(false);
    let cid = '';
    if (ipfs && file) { try { const result = await upload.mutateAsync({ data: { file } }); if (result.success) cid = result.cid; else setIpfsFallback(true); } catch { setIpfsFallback(true); } }
    try {
      const signer = await providerForWallet().getSigner();
      const contract = contractForChain(wallet.chainId, signer);
      const transaction = await contract.notarize(hash, description, cid);
      await transaction.wait();
      setTx(transaction.hash); setCid(cid); setTxState('success');
      void loadLedger();
    } catch (reason) { setTxState('error'); setError(reason instanceof Error && reason.message !== 'contract-not-configured' ? reason.message : 'The contract is not configured for this environment. Your fingerprint is safe to keep and publish later.'); }
  };
  const step = !file ? 0 : !hash ? 1 : txState === 'success' ? 3 : 2;
  return <div className="mx-auto max-w-[1200px] px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
    <section className="enter grid items-end gap-8 lg:grid-cols-[1fr_330px]"><div><p className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />Private by default</p><h1 className="max-w-[680px] font-serif text-[clamp(3.2rem,8vw,6.8rem)] leading-[.88] tracking-[-.055em]">Make it<br /><em className="text-[hsl(var(--primary))]">provable.</em></h1><p className="mt-6 max-w-[500px] text-base leading-7 text-[hsl(var(--muted-foreground))]">Create a time-stamped proof that your document existed — without handing over the document itself.</p></div><div className="hidden border-l border-[hsl(var(--border))] pl-6 lg:block"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">The protocol</p><p className="mt-3 font-serif text-2xl leading-tight">A fingerprint, not a copy.</p><p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">SHA-256 seals the file’s identity. The chain holds only the seal.</p></div></section>
     <div className="enter enter-delay-1 mt-12 flex gap-8 lg:mt-20"><StepRail active={step} /><div className="min-w-0 flex-1"><WalletNotice wallet={wallet} connect={walletControls.connect} /><div className="mt-5 rounded-[26px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-4 shadow-[0_20px_70px_hsl(204_36%_17%/.06)] sm:p-7"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Step {String(Math.min(step + 1, 3)).padStart(2, '0')}</p><h2 className="mt-2 font-serif text-3xl">{txState === 'success' ? 'A proof with a pulse.' : 'Choose your document'}</h2></div>{health.isLoading ? <span className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))]"><Loader2 size={11} className="animate-spin" />checking node</span> : <span className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))]"><span className={`h-1.5 w-1.5 rounded-full ${health.isError ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary))]'}`} />{health.isError ? 'proxy offline' : 'service ready'}</span>}</div>{txState === 'success' ? <><SuccessCard hash={hash} tx={tx} description={description} /><button onClick={() => { setFile(null); setHash(''); setDescription(''); setTx(''); setTxState('idle'); }} className="mt-5 flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" data-testid="button-new-notarization"><RefreshCw size={15} />Notarize another document</button></> : <><FileDrop file={file} onFile={setSelectedFile} /><div className="mt-5"><HashCard hash={hash} hashing={hashing} /></div>{hash && <div className="enter-delay-2 mt-5 space-y-4"><label className="block"><span className="mb-2 block text-sm font-semibold">What should this proof be called?</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Signed lease agreement — March 2025" className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] px-4 py-3 text-sm outline-none transition-shadow placeholder:text-[hsl(var(--muted-foreground)/.7)] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.1)]" data-testid="input-description" /></label><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[hsl(var(--border))] p-4 transition-colors hover:bg-[hsl(var(--muted)/.55)]"><input checked={ipfs} onChange={(event) => setIpfs(event.target.checked)} type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" data-testid="checkbox-ipfs-upload" /><span><span className="flex items-center gap-2 text-sm font-semibold"><CloudUpload size={15} className="text-[hsl(var(--primary))]" />Also pin a copy to IPFS <span className="rounded-full bg-[hsl(var(--accent)/.22)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">optional</span></span><span className="mt-1 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">Only enable this if you want the file to be retrievable. If pinning fails, your hash-only proof still works.</span></span></label>{ipfsFallback && <div className="flex gap-2 rounded-xl border border-[hsl(var(--accent)/.5)] bg-[hsl(var(--accent)/.1)] p-3 text-xs leading-5"><Info size={14} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />IPFS is unavailable right now. Continuing with a hash-only proof.</div>}<button onClick={submit} disabled={!wallet.connected || wallet.chainId !== EXPECTED_CHAIN || txState === 'pending'} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--foreground))] px-5 py-3.5 text-sm font-semibold text-[hsl(var(--background))] transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-submit-notarization">{txState === 'pending' ? <><Loader2 size={16} className="animate-spin" />Waiting for confirmation…</> : <>Publish proof on-chain <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}</button></div>}{txState === 'error' && <div className="mt-4 flex gap-2 rounded-xl border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.07)] p-3 text-xs leading-5 text-[hsl(var(--destructive))]" data-testid="status-notarization-error"><AlertCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}</>}</div></div></div>
  </div>;
}

function Verify() {
  const [wallet] = useWalletContext();
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState('');
  const [inputHash, setInputHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Verification | null>(null);
  const [error, setError] = useState('');
  const verify = async (value = inputHash) => {
    const clean = value.trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(clean)) { setError('Enter a valid 64-character SHA-256 hash.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      if (!window.ethereum || !CONTRACT_ADDRESS || !VERIFY_SELECTOR) { await new Promise((resolve) => setTimeout(resolve, 750)); setResult({ found: false, hash: clean }); return; }
      const raw = await rpc(window.ethereum, 'eth_call', [{ to: CONTRACT_ADDRESS, data: `0x${VERIFY_SELECTOR}${encodeHash(clean)}` }, 'latest']) as string;
      const found = raw !== '0x' && raw.length > 2;
      setResult({ found, hash: clean, owner: found && raw.length >= 66 ? `0x${raw.slice(-40)}` : undefined, timestamp: found ? formatDate() : undefined, description: found ? 'Document proof' : undefined });
    } catch { setError('The contract could not be reached. Check your network and try again.'); } finally { setLoading(false); }
  };
  const selectFile = async (next: File) => { setFile(next); setLoading(true); setError(''); try { const nextHash = await digestFile(next); setHash(nextHash); setInputHash(nextHash); setResult(null); } catch { setError('Could not read this file.'); } finally { setLoading(false); } };
  return <div className="mx-auto max-w-[1200px] px-5 pb-16 pt-10 sm:px-8 sm:pt-16"><section className="enter grid gap-8 lg:grid-cols-[1fr_330px]"><div><p className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]"><ShieldCheck size={13} />Open verification</p><h1 className="max-w-[650px] font-serif text-[clamp(3rem,7vw,6.3rem)] leading-[.88] tracking-[-.055em]">Does it<br /><em className="text-[hsl(var(--primary))]">exist?</em></h1><p className="mt-6 max-w-[500px] text-base leading-7 text-[hsl(var(--muted-foreground))]">Check a local file or a fingerprint against the public notary. Verification never uploads your document.</p></div><div className="hidden border-l border-[hsl(var(--border))] pl-6 lg:block"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Public ledger</p><p className="mt-3 font-serif text-2xl leading-tight">Proof without permission.</p><p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Anyone can verify. No account or private key required.</p></div></section><section className="enter enter-delay-1 mt-12 grid gap-5 lg:mt-20 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-[26px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-5 shadow-[0_20px_70px_hsl(204_36%_17%/.06)] sm:p-7"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Choose a method</p><h2 className="mt-2 font-serif text-3xl">Bring the evidence.</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><FileCheck2 size={20} /></span></div><label className="mt-7 block cursor-pointer rounded-2xl border-2 border-dashed border-[hsl(var(--border))] p-5 transition-colors hover:border-[hsl(var(--primary)/.55)] hover:bg-[hsl(var(--muted)/.45)]"><input type="file" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void selectFile(selected); }} data-testid="input-verify-file" /><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"><Upload size={19} /></span><span><span className="block text-sm font-semibold">{file ? file.name : 'Verify a local file'}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{file ? `${formatBytes(file.size)} · ${hash ? 'fingerprint ready' : 'reading…'}` : 'Hash it in your browser, never upload it'}</span></span></div></label><div className="my-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]"><span className="h-px flex-1 bg-[hsl(var(--border))]" />or paste a hash<span className="h-px flex-1 bg-[hsl(var(--border))]" /></div><div className="relative"><Hash className="absolute left-3 top-3.5 text-[hsl(var(--muted-foreground))]" size={15} /><input value={inputHash} onChange={(event) => { setInputHash(event.target.value); setResult(null); }} placeholder="0x…" className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.5)] py-3 pl-10 pr-3 font-mono text-xs outline-none focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.1)]" data-testid="input-verify-hash" /></div><button onClick={() => void verify()} disabled={loading || !inputHash} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--foreground))] px-5 py-3.5 text-sm font-semibold text-[hsl(var(--background))] transition-all hover:-translate-y-0.5 disabled:opacity-40" data-testid="button-verify-hash">{loading ? <><Loader2 size={16} className="animate-spin" />Checking ledger…</> : <>Check this fingerprint <ArrowRight size={16} /></>}</button>{error && <p className="mt-3 flex gap-2 text-xs leading-5 text-[hsl(var(--destructive))]" data-testid="status-verification-error"><AlertCircle size={14} className="mt-0.5 shrink-0" />{error}</p>}</div><div className="min-h-[420px] rounded-[26px] border border-[hsl(var(--border))] bg-[hsl(var(--foreground))] p-5 text-[hsl(var(--background))] sm:p-7"><div className="flex items-center justify-between border-b border-[hsl(var(--background)/.14)] pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--background)/.55)]">Notary record</p><h2 className="mt-2 font-serif text-3xl">The ledger says…</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--background)/.1)] text-[hsl(var(--accent))]"><Fingerprint size={19} /></span></div>{!result && !loading && <div className="flex min-h-[310px] flex-col items-center justify-center text-center"><div className="relative grid h-20 w-20 place-items-center rounded-full border border-[hsl(var(--background)/.16)]"><span className="absolute inset-2 rounded-full border border-dashed border-[hsl(var(--accent)/.5)]" /><FileText size={25} className="text-[hsl(var(--background)/.55)]" /></div><p className="mt-5 font-serif text-xl">Waiting for a fingerprint</p><p className="mt-2 max-w-[240px] text-xs leading-5 text-[hsl(var(--background)/.55)]">Your result will appear here, with the original file still in your hands.</p></div>}{loading && <div className="flex min-h-[310px] flex-col items-center justify-center text-center"><div className="relative grid h-20 w-20 place-items-center rounded-full border border-[hsl(var(--accent)/.5)]"><div className="absolute inset-0 rounded-full border-t-2 border-[hsl(var(--accent))] animate-spin" /><Fingerprint size={25} className="text-[hsl(var(--accent))]" /></div><p className="mt-5 font-serif text-xl">Reading the ledger</p><p className="mt-2 text-xs text-[hsl(var(--background)/.55)]">A moment of cryptographic patience.</p></div>}{result && !loading && <VerificationResult result={result} wallet={wallet} />}</div></section></div>;
}

function VerificationResult({ result, wallet }: { result: Verification; wallet: WalletState }) {
  if (!result.found) return <div className="flex min-h-[310px] flex-col items-center justify-center text-center" data-testid="status-verification-missing"><span className="grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--accent)/.16)] text-[hsl(var(--accent))]"><X size={25} /></span><p className="mt-5 font-serif text-2xl">No record found.</p><p className="mt-2 max-w-[280px] text-xs leading-5 text-[hsl(var(--background)/.55)]">This fingerprint is not in the configured ledger. That does not mean the file is invalid — only that Proofmark has not seen it.</p><p className="mt-5 break-all font-mono text-[10px] text-[hsl(var(--background)/.55)]">{shortHash(result.hash)}</p></div>;
  return <div className="enter pt-7" data-testid="status-verification-found"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Check size={19} /></span><div><p className="font-semibold">Authentic proof found</p><p className="text-xs text-[hsl(var(--background)/.55)]">Anchored on {EXPECTED_NETWORK}</p></div></div><dl className="mt-7 space-y-4 text-xs"><div className="flex items-center justify-between gap-4 border-t border-[hsl(var(--background)/.14)] pt-3"><dt className="text-[hsl(var(--background)/.55)]">Timestamp</dt><dd>{result.timestamp}</dd></div><div className="flex items-center justify-between gap-4"><dt className="text-[hsl(var(--background)/.55)]">Owner</dt><dd className="font-mono">{shortAddress(result.owner || wallet.address || '0x0000…0000')}</dd></div><div className="flex items-center justify-between gap-4"><dt className="text-[hsl(var(--background)/.55)]">Description</dt><dd>{result.description}</dd></div></dl><div className="mt-7 rounded-xl bg-[hsl(var(--background)/.08)] p-3"><p className="text-[10px] uppercase tracking-wider text-[hsl(var(--background)/.5)]">Matched SHA-256</p><p className="mt-2 break-all font-mono text-[10px] leading-4 text-[hsl(var(--background)/.8)]">{result.hash}</p></div></div>;
}

function useWallet(): [WalletState, { connect: () => Promise<void> }] {
  const [wallet, setWallet] = useState<WalletState>({ address: '', chainId: '', network: '', connected: false, connecting: false });
  const connect = async () => { if (!window.ethereum) { setWallet((current) => ({ ...current, connecting: false })); return; } setWallet((current) => ({ ...current, connecting: true })); try { const accounts = await rpc(window.ethereum, 'eth_requestAccounts') as string[]; const chainId = await rpc(window.ethereum, 'eth_chainId') as string; setWallet({ address: accounts[0] || '', chainId: String(parseInt(chainId, 16)), network: networkNames[String(parseInt(chainId, 16))] || `Chain ${parseInt(chainId, 16)}`, connected: Boolean(accounts[0]), connecting: false }); } catch { setWallet((current) => ({ ...current, connecting: false })); } };
  useEffect(() => { if (!window.ethereum) return; const onAccounts = (accounts: unknown) => { const list = accounts as string[]; setWallet((current) => ({ ...current, address: list[0] || '', connected: Boolean(list[0]) })); }; const onChain = (chain: unknown) => { const id = parseInt(String(chain).replace(/^0x/, ''), String(chain).startsWith('0x') ? 16 : 10); setWallet((current) => ({ ...current, chainId: String(id), network: networkNames[String(id)] || `Chain ${id}` })); }; window.ethereum.on?.('accountsChanged', onAccounts); window.ethereum.on?.('chainChanged', onChain); return () => { window.ethereum?.removeListener?.('accountsChanged', onAccounts); window.ethereum?.removeListener?.('chainChanged', onChain); }; }, []); 
  return [wallet, { connect }];
}

const WalletContext = createContext<[WalletState, { connect: () => Promise<void> }] | null>(null);
function useWalletContext() {
  const value = useContext(WalletContext);
  if (!value) throw new Error('Wallet context is unavailable');
  return value;
}

function AppRouter() {
  const [wallet, controls] = useWallet();
  return <WalletContext.Provider value={[wallet, controls]}><Shell wallet={wallet} connect={controls.connect}><ErrorBoundary><Switch><Route path="/" component={Notarize} /><Route path="/verify" component={Verify} /><Route component={() => <div className="mx-auto max-w-xl px-5 py-32 text-center"><h1 className="font-serif text-5xl">Not found.</h1><Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--primary))]" data-testid="link-back-home">Return to Proofmark <ArrowRight size={15} /></Link></div>} /></Switch></ErrorBoundary></Shell></WalletContext.Provider>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><AppRouter /><Toaster /></TooltipProvider></QueryClientProvider>;
}