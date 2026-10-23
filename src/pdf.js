// Offline PDF writer: embedded TrueType, selectable Unicode text, A4 pages.
export const SITE_URL='https://tchk-project.github.io/belbin-test/';
export function createReportPdf(pages,font){
 const enc=new TextEncoder(),objects=[null],used=new Map();
 const add=value=>(objects.push(value),objects.length-1);
 const bytes=s=>enc.encode(s);
 const concat=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;};
 const stream=(data,extra='')=>concat([bytes(`<< /Length ${data.length} ${extra} >>\nstream\n`),data,bytes('\nendstream')]);
 const info=char=>font.chars[char.codePointAt(0)]||font.chars[63];
 const width=(s,size)=>Array.from(s).reduce((n,c)=>n+info(c)[1]*size/1000,0);
 const hex=s=>Array.from(s).map(c=>{const cp=c.codePointAt(0),key=font.chars[cp]?cp:63;if(!used.has(key))used.set(key,used.size+1);return used.get(key).toString(16).padStart(4,'0');}).join('');
 const utf16=cp=>cp<=65535?cp.toString(16).padStart(4,'0'):[0xd800+((cp-65536)>>10),0xdc00+((cp-65536)&1023)].map(n=>n.toString(16)).join('');
 const catalog=add(''),pagesId=add(''),fontId=add('');
 const pageIds=[];
 const draw=(s,x,y,size,color='0.10 0.20 0.17')=>`BT /F1 ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm <${hex(s)}> Tj ET\n`;
 const rgb=color=>color.slice(1).match(/../g).map(v=>(parseInt(v,16)/255).toFixed(4)).join(' ');
 pages.forEach((nodes,index)=>{
  let content='';
  for(const n of nodes)content+=n.type==='text'?draw(n.text,n.x,841.89-n.y,n.size,rgb(n.color)):`${rgb(n.color)} rg ${n.x} ${841.89-n.y-n.h} ${n.w} ${n.h} re f\n`;
  const links=nodes.filter(n=>n.type==='text'&&n.text==='Пройти тест: '+SITE_URL).map(n=>add(`<< /Type /Annot /Subtype /Link /Rect [${n.x} ${841.89-n.y-3} 547 ${841.89-n.y+n.size}] /Border [0 0 0] /A << /S /URI /URI (${SITE_URL}) >> >>`));
  const contentId=add(stream(bytes(content)));
  pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R /Annots [${links.map(id=>`${id} 0 R`).join(' ')}] >>`));
 });
 const fontBytes=Uint8Array.from(atob(font.base64),c=>c.charCodeAt(0));
 const fileId=add(stream(fontBytes,`/Length1 ${fontBytes.length}`));
 const descriptor=add(`<< /Type /FontDescriptor /FontName /DejaVuSans /Flags 32 /FontBBox [-1100 -500 2200 1300] /ItalicAngle 0 /Ascent 928 /Descent -236 /CapHeight 729 /StemV 80 /FontFile2 ${fileId} 0 R >>`);
 const gidMap=new Uint8Array((used.size+1)*2);const widths=[];const mappings=[];
 for(const [cp,cid] of used){const [gid,w]=font.chars[cp];gidMap[cid*2]=gid>>8;gidMap[cid*2+1]=gid&255;widths.push(`${cid} [${w}]`);mappings.push(`<${cid.toString(16).padStart(4,'0')}> <${utf16(cp)}>`);}
 const gidId=add(stream(gidMap));
 let cmap='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /BelbinUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <ffff>\nendcodespacerange\n';
 for(let i=0;i<mappings.length;i+=100){const batch=mappings.slice(i,i+100);cmap+=`${batch.length} beginbfchar\n${batch.join('\n')}\nendbfchar\n`;}
 cmap+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
 const unicode=add(stream(bytes(cmap)));
 const descendant=add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /W [${widths.join(' ')}] /CIDToGIDMap ${gidId} 0 R >>`);
 objects[fontId]=`<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${unicode} 0 R >>`;
 objects[catalog]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
 objects[pagesId]=`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] >>`;
 const parts=[bytes('%PDF-1.4\n')],offsets=[0];let offset=parts[0].length;
 for(let i=1;i<objects.length;i++){offsets[i]=offset;const body=objects[i] instanceof Uint8Array?objects[i]:bytes(objects[i]);const part=concat([bytes(`${i} 0 obj\n`),body,bytes('\nendobj\n')]);parts.push(part);offset+=part.length;}
 parts.push(bytes(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${offset}\n%%EOF\n`));
 return concat(parts);
}


export function layoutReport(data,answers,comments,font){
 const scores=data.key[0].map((_,i)=>data.key.reduce((sum,row,b)=>sum+answers[b][row[i]-(b+1)*10],0));
 const order=scores.map((_,i)=>i).sort((a,b)=>scores[b]-scores[a]||a-b);
 const high=order.filter(i=>scores[i]>=scores[order[2]]),low=order.filter(i=>scores[i]<=scores[order[5]]).sort((a,b)=>scores[a]-scores[b]||a-b);
 const pages=[[]];let page=pages[0],y=48;
 const color='#193d33',muted='#596b60',green='#164d43';
 const measure=(s,size)=>Array.from(s).reduce((n,c)=>n+(font.chars[c.codePointAt(0)]||font.chars[63])[1]*size/1000,0);
 const wrap=(s,size,width)=>{const out=[];for(const paragraph of String(s).split(/\r?\n/)){let line='';for(const word of paragraph.split(/( +)/)){if(line&&measure(line+word,size)>width){out.push(line.trimEnd());line='';}for(const c of word){if(line&&measure(line+c,size)>width){out.push(line);line='';}line+=c;}}out.push(line.trimEnd());}return out;};
 const ensure=h=>{if(y+h>775){page=[];pages.push(page);y=48;}};
 const text=(s,x,at,size=10,fill=color)=>page.push({type:'text',text:s,x,y:at,size,color:fill});
 const rect=(x,at,w,h,fill)=>page.push({type:'rect',x,y:at,w,h,color:fill});
 const paragraph=(s,size=10.5,gap=9)=>{const lines=wrap(s,size,499);for(const line of lines){ensure(size*1.5);text(line,48,y+size,size);y+=size*1.5;}y+=gap;};
 const heading=(s,size=17)=>{ensure(65);paragraph(s,size,12);};
 text('ТЕСТ ЗАВЕРШЁН · 70 ИЗ 70 БАЛЛОВ',48,y,9,muted);y+=27;
 heading('Ваши командные роли',28);
 paragraph('Посмотрите на роли с наибольшими и наименьшими баллами. Прочитайте их описание и отметьте, насколько это про вас.',11,20);
 const groups=[['Ведущие роли',high],['Роли с меньшими баллами',low]];
 const cardLines=groups.map(([title,ids])=>[title,...ids.map(i=>`${data.roles[i].name}: ${scores[i]}`)]);
 const cards=cardLines.map(lines=>lines.flatMap((s,i)=>wrap(s,i===0?13:11,215).map(text=>({text,size:i===0?13:11}))));
 const cardHeight=Math.max(...cards.map(lines=>lines.length))*19+32;ensure(cardHeight+18);
 cards.forEach((lines,i)=>{const x=48+i*258;rect(x,y,241,cardHeight,i===0?'#eef1e7':'#f5f5f1');lines.forEach((line,j)=>text(line.text,x+13,y+23+j*19,line.size));});y+=cardHeight+20;
 if(high.length>3||low.length>3)paragraph('На границе тройки есть одинаковые баллы: показаны все роли с этим результатом. В исходнике нет правила выбора между равными результатами.',9.5);
 heading('Все восемь ролей');
 for(const i of order){ensure(40);text(data.roles[i].name,48,y+11,11);text(`${scores[i]} / 70`,505,y+11,10);rect(48,y+21,499,7,'#e8ece2');rect(48,y+21,499*scores[i]/70,7,green);y+=39;}
 paragraph('Баллы по исходному ключу. Это не проценты и не оценка «хорошо / плохо».',9.5);
 heading('Проверить расчёт по блокам');
 const tableHeader=()=>{ensure(75);rect(48,y,499,48,'#eef1e7');text('Блок',52,y+15,7);data.roles.forEach((r,i)=>wrap(r.name,6.5,44).forEach((s,j)=>text(s,90+i*50,y+13+j*10,6.5)));text('Сумма',495,y+15,7);y+=48;};
 tableHeader();
 [...data.key.map((row,b)=>[String(b+1),...row.map(q=>answers[b][q-(b+1)*10]),10]),['Итого',...scores,70]].forEach((row,b)=>{if(y+23>775){ensure(80);tableHeader();}rect(48,y,499,22,b%2?'#f4f6f1':'#ffffff');text(row[0],52,y+15,8);row.slice(1,9).forEach((v,i)=>text(String(v),90+i*50,y+15,8));text(String(row[9]),505,y+15,8);y+=22;});y+=24;
 heading('Насколько это про вас?');
 for(const i of order){
  heading(`${data.roles[i].name} · ${scores[i]}`,15);
  if(high.includes(i)||low.includes(i))paragraph([high.includes(i)?'Наибольшие баллы':'',low.includes(i)?'Наименьшие баллы':''].filter(Boolean).join(' · '),9,5);
  paragraph(data.roles[i].description,10.5,10);
  paragraph('Мой комментарий: насколько это про меня',9.5,4);
  paragraph(comments[i]||'Комментарий не добавлен.',10.5,21);
 }
 paragraph('Описания приведены по исходному документу без изменения формулировок.',9);
 paragraph('Источник: '+data.source.url,8);
 paragraph('Пройти тест: '+SITE_URL,10);
 pages.forEach((p,i)=>{p.push({type:'rect',x:48,y:797,w:499,h:.5,color:'#c7d2c7'});p.push({type:'text',text:`${i+1} / ${pages.length}`,x:510,y:812,size:8,color:muted});});
 return pages;
}
export function reportPrintHtml(pages){
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return pages.map(nodes=>`<svg xmlns="http://www.w3.org/2000/svg" class="report-page" viewBox="0 0 595.28 841.89" role="img" aria-label="Страница результата">${nodes.map(n=>n.type==='rect'?`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" fill="${n.color}"/>`:`<text x="${n.x}" y="${n.y}" font-size="${n.size}" fill="${n.color}">${escape(n.text)}</text>`).join('')}${nodes.filter(n=>n.type==='text'&&n.text==='Пройти тест: '+SITE_URL).map(n=>`<a href="${SITE_URL}"><rect x="${n.x}" y="${n.y-n.size}" width="499" height="${n.size+4}" fill="transparent"/></a>`).join('')}</svg>`).join('');
}
