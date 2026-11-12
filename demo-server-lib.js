const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'demo-db.json');
const sessions = new Map();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === calc.length && crypto.timingSafeEqual(calc, expected);
}
function seedDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
  if (fs.existsSync(DB_FILE)) return;
  const users = [
    {id:1,name:'Yony Patiño',email:'yony@belloalerta.local',passwordHash:hashPassword('Ciudadano123*'),role:'citizen'},
    {id:2,name:'Administrador Bello Alerta',email:'admin@belloalerta.local',passwordHash:hashPassword('Admin123*'),role:'admin'}
  ];
  const reports = [
    {id:1,code:'BR-028',userId:1,category:'Grieta o fisura en terreno',description:'Se observa una grieta reciente en el terreno y desprendimiento menor de material cerca del borde de la vía.',sector:'París',perceivedLevel:'Alto',observedAt:'2026-11-08',lat:6.3373,lng:-75.5579,photoData:'',status:'En revisión',createdAt:'2026-11-08T13:42:00Z',updatedAt:'2026-11-09T14:20:00Z'},
    {id:2,code:'BR-027',userId:1,category:'Desprendimiento de material',description:'Material suelto visible en sendero cercano a zona de ladera.',sector:'La Gabriela',perceivedLevel:'Medio',observedAt:'2026-11-06',lat:6.3447,lng:-75.5521,photoData:'',status:'Registrado',createdAt:'2026-11-06T15:10:00Z',updatedAt:'2026-11-06T15:10:00Z'},
    {id:3,code:'BR-025',userId:1,category:'Erosión superficial',description:'Erosión superficial y humedad persistente en borde de vía.',sector:'Niquía',perceivedLevel:'Bajo',observedAt:'2026-11-02',lat:6.3297,lng:-75.5588,photoData:'',status:'Atendido',createdAt:'2026-11-02T11:05:00Z',updatedAt:'2026-11-05T16:00:00Z'}
  ];
  const history = [
    {id:1,reportId:1,userId:1,status:'Registrado',note:'Reporte ciudadano creado.',createdAt:'2026-11-08T13:42:00Z'},
    {id:2,reportId:1,userId:2,status:'En revisión',note:'Se recomienda revisión por entidad competente.',createdAt:'2026-11-09T14:20:00Z'},
    {id:3,reportId:2,userId:1,status:'Registrado',note:'Reporte ciudadano creado.',createdAt:'2026-11-06T15:10:00Z'},
    {id:4,reportId:3,userId:1,status:'Registrado',note:'Reporte ciudadano creado.',createdAt:'2026-11-02T11:05:00Z'},
    {id:5,reportId:3,userId:2,status:'Atendido',note:'Caso revisado en ambiente simulado.',createdAt:'2026-11-05T16:00:00Z'}
  ];
  fs.writeFileSync(DB_FILE, JSON.stringify({users,reports,history,nextReportId:4,nextHistoryId:6},null,2));
}
function readDb(){ seedDb(); return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }
function writeDb(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2)); }
function json(res,status,data){ const body=JSON.stringify(data); res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body)}); res.end(body); }
function parseBody(req){ return new Promise((resolve,reject)=>{ let data=''; req.on('data',c=>{ data+=c; if(data.length>3_000_000){ reject(new Error('Payload demasiado grande')); req.destroy(); }}); req.on('end',()=>{ try{ resolve(data?JSON.parse(data):{}); }catch(e){ reject(e); }}); req.on('error',reject); }); }
function auth(req){ const h=req.headers.authorization||''; const token=h.startsWith('Bearer ')?h.slice(7):''; const session=sessions.get(token); if(!session) return null; if(Date.now()>session.expires){ sessions.delete(token); return null; } return session; }
function userView(u){ return {id:u.id,name:u.name,email:u.email,role:u.role}; }
function reportView(r,db){ return {...r, history:db.history.filter(h=>h.reportId===r.id).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))}; }
function createToken(user){ const token=crypto.randomBytes(24).toString('hex'); sessions.set(token,{userId:user.id,role:user.role,expires:Date.now()+8*60*60*1000}); return token; }
function mime(file){ const ext=path.extname(file).toLowerCase(); return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'})[ext]||'application/octet-stream'; }
function serveStatic(req,res){ let pathname=decodeURIComponent(new URL(req.url,'http://x').pathname); if(pathname==='/') pathname='/index.html'; const file=path.normalize(path.join(PUBLIC,pathname)); if(!file.startsWith(PUBLIC)) return false; if(!fs.existsSync(file)||fs.statSync(file).isDirectory()) return false; const buf=fs.readFileSync(file); res.writeHead(200,{'Content-Type':mime(file),'Content-Length':buf.length,'Cache-Control':'no-cache'}); res.end(buf); return true; }

function createServer(){
 seedDb();
 return http.createServer(async (req,res)=>{
  const url=new URL(req.url,'http://localhost');
  try{
   if(url.pathname==='/api/health') return json(res,200,{ok:true,mode:'demo-json',trl:'TRL5-demostracion-controlada'});
   if(req.method==='POST' && url.pathname==='/api/login'){
    const body=await parseBody(req); const db=readDb(); const user=db.users.find(u=>u.email.toLowerCase()===String(body.email||'').toLowerCase());
    if(!user||!verifyPassword(String(body.password||''),user.passwordHash)) return json(res,401,{error:'Credenciales inválidas'});
    const token=createToken(user); return json(res,200,{token,user:userView(user)});
   }
   if(url.pathname.startsWith('/api/')){
    const session=auth(req); if(!session) return json(res,401,{error:'Sesión no válida'});
    const db=readDb(); const user=db.users.find(u=>u.id===session.userId);
    if(req.method==='GET' && url.pathname==='/api/me') return json(res,200,userView(user));
    if(req.method==='GET' && url.pathname==='/api/stats'){
      const rows=session.role==='admin'?db.reports:db.reports.filter(r=>r.userId===user.id);
      return json(res,200,{total:rows.length,registered:rows.filter(r=>r.status==='Registrado').length,review:rows.filter(r=>r.status==='En revisión').length,attended:rows.filter(r=>r.status==='Atendido').length,high:rows.filter(r=>r.perceivedLevel==='Alto').length});
    }
    if(req.method==='GET' && url.pathname==='/api/reports'){
      let rows=session.role==='admin'?db.reports:db.reports.filter(r=>r.userId===user.id);
      const status=url.searchParams.get('status'); const sector=url.searchParams.get('sector'); const q=(url.searchParams.get('q')||'').toLowerCase();
      if(status) rows=rows.filter(r=>r.status===status); if(sector) rows=rows.filter(r=>r.sector===sector); if(q) rows=rows.filter(r=>(r.code+' '+r.category+' '+r.description+' '+r.sector).toLowerCase().includes(q));
      return json(res,200,rows.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)));
    }
    const match=url.pathname.match(/^\/api\/reports\/(\d+)$/);
    if(req.method==='GET' && match){ const r=db.reports.find(x=>x.id===Number(match[1])); if(!r) return json(res,404,{error:'Reporte no encontrado'}); if(session.role!=='admin'&&r.userId!==user.id) return json(res,403,{error:'Acceso denegado'}); return json(res,200,reportView(r,db)); }
    if(req.method==='POST' && url.pathname==='/api/reports'){
      if(session.role!=='citizen') return json(res,403,{error:'Solo ciudadanos pueden crear reportes'});
      const b=await parseBody(req); const required=['category','description','sector','perceivedLevel','observedAt','lat','lng']; const missing=required.filter(k=>b[k]===undefined||b[k]===''); if(missing.length) return json(res,400,{error:'Faltan campos: '+missing.join(', ')});
      const id=db.nextReportId++; const r={id,code:`BR-${String(28+id).padStart(3,'0')}`,userId:user.id,category:String(b.category),description:String(b.description),sector:String(b.sector),perceivedLevel:String(b.perceivedLevel),observedAt:String(b.observedAt),lat:Number(b.lat),lng:Number(b.lng),photoData:String(b.photoData||''),status:'Registrado',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; db.reports.push(r); db.history.push({id:db.nextHistoryId++,reportId:id,userId:user.id,status:'Registrado',note:'Reporte ciudadano creado.',createdAt:new Date().toISOString()}); writeDb(db); return json(res,201,reportView(r,db));
    }
    if(req.method==='PATCH' && match){ if(session.role!=='admin') return json(res,403,{error:'Solo administración puede actualizar estados'}); const r=db.reports.find(x=>x.id===Number(match[1])); if(!r) return json(res,404,{error:'Reporte no encontrado'}); const b=await parseBody(req); const allowed=['Registrado','En revisión','Atendido']; if(!allowed.includes(b.status)) return json(res,400,{error:'Estado inválido'}); r.status=b.status; r.updatedAt=new Date().toISOString(); db.history.push({id:db.nextHistoryId++,reportId:r.id,userId:user.id,status:b.status,note:String(b.note||'Actualización administrativa.'),createdAt:new Date().toISOString()}); writeDb(db); return json(res,200,reportView(r,db)); }
    return json(res,404,{error:'Ruta API no encontrada'});
   }
   if(serveStatic(req,res)) return;
   res.writeHead(404); res.end('No encontrado');
  }catch(err){ console.error(err); if(!res.headersSent) json(res,500,{error:'Error interno',detail:err.message}); else res.end(); }
 });
}
module.exports={createServer,DB_FILE};
