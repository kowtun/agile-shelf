'use client';

import {useEffect,useMemo,useState} from 'react';
import {flushSync} from 'react-dom';
import {BookOpen,ArrowUpRight,Search,Sparkles} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';

export type Book={id:string;bookTitle:string;bookSubtitle?:string|null;authors?:string[]|null;description?:string|null;personalNote?:string|null;recommendedFor?:string|null;isbn13?:string|null;isbn10?:string|null;publisher?:string|null;edition?:string|null;publicationDate?:string|null;pageCount?:number|null;bookLanguage?:string|null;bookFormat?:string|null;isFeatured?:boolean|null;orderId?:number|null;amazonAsin?:string|null;amazonAffiliateUrl?:string|null;coverImageUrl?:string|null;coverAlt?:string|null;category?:{name:string;slug?:string|null}|null;topics?:{name:string}[]|null};
type Settings={name?:string;introduction?:string;affiliateTag:string;marketplace:string;affiliateDisclosure?:string};
const categoryOf=(book:Book)=>book.category?.name||'Uncategorised';

export default function Shelf({initialBooks:initial,settings}:{initialBooks:Book[];settings?:Settings}){
  const [books,setBooks]=useState(initial);
  const [siteSettings,setSiteSettings]=useState(settings);
  const [connectionNote,setConnectionNote]=useState('');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('All books');
  const [language,setLanguage]=useState('All languages');
  const [topic,setTopic]=useState('All topics');
  const [sort,setSort]=useState('Reading list');
  const [selected,setSelected]=useState<Book|null>(null);

  useEffect(()=>{
    const timer=setInterval(()=>{fetch('/api/library').then(response=>response.ok?response.json() as Promise<{books?:Book[];settings?:Settings;mode?:string}>:null).then(data=>{
      if(data?.books){setBooks(data.books);if(data.settings)setSiteSettings(data.settings);setConnectionNote(data.mode==='stale'?'Showing the last available data.':data.mode==='preview'?'Private preview · snapshot from Hygraph.':'Live data from Hygraph.');}
    }).catch(()=>{});},60000);
    return()=>clearInterval(timer);
  },[]);

  const featured=books.find(book=>book.isFeatured)||books.find(book=>book.bookTitle==='Leading Change');
  const categories=Array.from(new Set(books.map(categoryOf)));
  const languages=Array.from(new Set(books.map(book=>book.bookLanguage).filter(Boolean))) as string[];
  const topics=Array.from(new Set(books.flatMap(book=>book.topics?.map(item=>item.name)||[]))).sort();
  const visible=useMemo(()=>books.filter(book=>
    (category==='All books'||categoryOf(book)===category)&&
    (language==='All languages'||book.bookLanguage===language)&&
    (topic==='All topics'||book.topics?.some(item=>item.name===topic))&&
    [book.bookTitle,book.bookSubtitle,...(book.authors||[]),book.description].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase())
  ).sort((a,b)=>sort==='Title A–Z'?a.bookTitle.localeCompare(b.bookTitle):(a.orderId||999)-(b.orderId||999)),[books,category,language,topic,query,sort]);

  const reset=()=>{setQuery('');setCategory('All books');setLanguage('All languages');setTopic('All topics');};
  const filter=(label:string,value:string,options:string[],set:(value:string)=>void)=><Select value={value} onValueChange={value=>value&&set(value)}><SelectTrigger aria-label={label}><SelectValue>{value}</SelectValue></SelectTrigger><SelectContent>{options.map(option=><SelectItem value={option} key={option}>{option}</SelectItem>)}</SelectContent></Select>;
  const buy=(book:Book)=>{
    const marketplace=['www.amazon.de','www.amazon.com','www.amazon.co.uk'].includes(siteSettings?.marketplace||'')?siteSettings!.marketplace:'www.amazon.de';
    const url=book.amazonAsin?`https://${marketplace}/dp/${encodeURIComponent(book.amazonAsin)}?tag=${encodeURIComponent(siteSettings?.affiliateTag||'scifor-21')}`:book.amazonAffiliateUrl;
    if(!url||!/^https:\/\/(www\.)?(amazon\.(de|com|co\.uk)|amzn\.to)\//i.test(url))return null;
    return <a className="buy" href={url} target="_blank" rel="sponsored noopener noreferrer">View on Amazon <ArrowUpRight size={18}/></a>;
  };

  useEffect(()=>{
    const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context)return;
    const lifecycle=new AbortController();
    const tool={name:'search_library',description:'Search book titles and authors, reset other filters, and show the matching books.',inputSchema:{type:'object',properties:{query:{type:'string',maxLength:200}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:(input:unknown)=>{
      if(!input||typeof input!=='object'||typeof (input as {query?:unknown}).query!=='string')throw new Error('query must be a string');
      const search=(input as {query:string}).query;
      if(search.length>200)throw new Error('query is too long');
      flushSync(()=>{setQuery(search);setCategory('All books');setLanguage('All languages');setTopic('All topics');});
      return {books:books.filter(book=>[book.bookTitle,book.bookSubtitle,...(book.authors||[]),book.description].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())).map(book=>({id:book.id,title:book.bookTitle}))};
    }};
    try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
    return()=>lifecycle.abort();
  },[books]);

  return <>
    <a className="skip" href="#library">Skip to books</a>
    <header>
      <a className="brand" href="#"><BookOpen/>{siteSettings?.name||'Agile Shelf'}.</a>
      <nav><a href="#library">The library</a><a href="#about">About</a></nav>
      <span>Ideas worth making room for.</span>
    </header>
    <main>
      <section className="hero">
        <div className="intro">
          <div className="eyebrow">A READING LIST FOR PEOPLE WHO BUILD BETTER</div>
          <h1>Small shelf.<br/><em>Big shifts.</em></h1>
          <p>{siteSettings?.introduction||'Explore the books behind better teams, thoughtful leadership, and lasting change.'}</p>
          <a href="#library" className="text-link">Explore the collection ↓</a>
        </div>
        {featured&&<section className="spotlight">
          <div className="eyebrow"><Sparkles size={17}/> FEATURED PICK</div>
          <div className="feature-grid">
            <div className="feature-copy">
              <p className="feature-category">{categoryOf(featured)}</p>
              <h2>{featured.bookTitle}</h2>
              <p className="author">{featured.authors?.join(', ')||'John P. Kotter'}</p>
              <p>{featured.description||'A starting point for thinking about how organisations change, and how leaders help people move forward together.'}</p>
              <button className="feature-button" onClick={()=>setSelected(featured)}>Explore this book <ArrowUpRight size={18}/></button>
            </div>
            <aside>{featured.coverImageUrl?<img src={featured.coverImageUrl} alt={featured.coverAlt||featured.bookTitle} width={220} height={330}/>:<><BookOpen size={40}/><p>Better change<br/>starts with<br/><em>better questions.</em></p></>}</aside>
          </div>
        </section>}
      </section>
      <section id="library">
        <div className="eyebrow">THE COLLECTION</div>
        <h2>Find your next perspective.</h2>
        <p className="muted">Pick a path. Follow your curiosity.</p>
        <div className="categories">{['All books',...categories].map(item=><button key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}<small>{item==='All books'?books.length:books.filter(book=>categoryOf(book)===item).length}</small></button>)}</div>
        <div className="filters">
          <label className="search"><Search size={18}/><span className="sr-only">Search books</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search titles, authors, or ideas…"/></label>
          {filter('Topic',topic,['All topics',...topics],setTopic)}
          {filter('Language',language,['All languages',...languages],setLanguage)}
          {filter('Sort',sort,['Reading list','Title A–Z'],setSort)}
        </div>
        <p className="connection-note" role="status">{connectionNote}</p>
        <div className="results" role="status">{visible.length} books on this shelf <button onClick={reset}>Reset filters</button></div>
        <div className="grid">{visible.map((book,index)=><article key={book.id}>
          <div className="card-top"><span>{categoryOf(book)}</span><span>{String(index+1).padStart(2,'0')}</span></div>
          {book.coverImageUrl&&<img className="cover" src={book.coverImageUrl} alt={book.coverAlt||book.bookTitle} width={120} height={180} loading="lazy"/>}
          <button className="book-title" onClick={()=>setSelected(book)}><h3>{book.bookTitle}</h3></button>
          {!!book.authors?.length&&<p className="author">{book.authors.join(', ')}</p>}
          {book.bookSubtitle&&<p className="subtitle">{book.bookSubtitle}</p>}
          {book.description&&<p className="summary">{book.description}</p>}
          <div className="card-bottom"><button onClick={()=>setSelected(book)} aria-label={`Details for ${book.bookTitle}`}>Book details <ArrowUpRight size={16}/></button><span>{book.bookLanguage}</span></div>
        </article>)}</div>
        {!visible.length&&<div className="empty"><h3>No matching books.</h3><p>Try another search or reset your filters.</p><button onClick={reset}>Show all books</button></div>}
      </section>
      <section id="about"><div className="eyebrow">ABOUT THE SHELF</div><h2>Good ideas deserve<br/>a place to grow.</h2><p>A growing collection of books about agile ways of working, product development, and the human side of change. Start with the foundations, go deeper, or discover something unexpected.</p></section>
    </main>
    <footer><a className="brand" href="#">agile shelf.</a><p>{siteSettings?.affiliateDisclosure||'As an Amazon Associate I earn from qualifying purchases.'}<br/>Amazon links are affiliate links.</p><span>Stay curious.</span></footer>
    <Dialog open={!!selected} onOpenChange={open=>!open&&setSelected(null)}><DialogContent className="book-dialog">{selected&&<>
      <span className="eyebrow">{categoryOf(selected)}</span>
      <DialogTitle className="dialog-title">{selected.bookTitle}</DialogTitle>
      <DialogDescription>{selected.bookSubtitle||selected.authors?.join(', ')||'Book details'}</DialogDescription>
      {!!selected.authors?.length&&<p>{selected.authors.join(', ')}</p>}
      {selected.description&&<p>{selected.description}</p>}
      <dl>{[['Language',selected.bookLanguage],['Pages',selected.pageCount],['Publisher',selected.publisher],['Edition',selected.edition],['Format',selected.bookFormat],['Published',selected.publicationDate],['ISBN-13',selected.isbn13],['ISBN-10',selected.isbn10]].filter(([,value])=>value).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      {selected.personalNote&&<section><h3>Why this book matters to me</h3><p>{selected.personalNote}</p></section>}
      {selected.recommendedFor&&<p>Recommended for: {selected.recommendedFor}</p>}
      {buy(selected)}
    </>}</DialogContent></Dialog>
  </>;
}
