import Shelf from './shelf';
import {getLibrary} from '@/lib/library';
export default async function Home(){const library=await getLibrary();return <><div className="preview-note">{library.mode==='preview'?'Private MVP preview · Hygraph snapshot · Amazon covers and edition details are being completed.':library.mode==='stale'?'Showing the last available library data.':'Connected to Hygraph'}</div><Shelf initialBooks={library.books} settings={library.settings}/></>;}
