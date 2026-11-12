const crypto=require('crypto');
const {Pool}=require('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL||'postgres://bello:bello@localhost:5432/bello_alerta'});
function hash(p){const salt=crypto.randomBytes(16).toString('hex');return `${salt}:${crypto.scryptSync(p,salt,64).toString('hex')}`;}
(async()=>{const c=await pool.connect();try{
 await c.query("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'citizen') ON CONFLICT(email) DO NOTHING",['Yony Patiño','yony@belloalerta.local',hash('Ciudadano123*')]);
 await c.query("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'admin') ON CONFLICT(email) DO NOTHING",['Administrador Bello Alerta','admin@belloalerta.local',hash('Admin123*')]);
 const u=await c.query("SELECT id FROM users WHERE email='yony@belloalerta.local'"); const uid=u.rows[0].id;
 const cnt=await c.query('SELECT COUNT(*)::int n FROM reports');
 if(cnt.rows[0].n===0){
  const seed=[
   ['BR-028','Grieta o fisura en terreno','Se observa una grieta reciente en el terreno y desprendimiento menor de material cerca del borde de la vía.','París','Alto','2026-11-08',-75.5579,6.3373,'En revisión'],
   ['BR-027','Desprendimiento de material','Material suelto visible en sendero cercano a zona de ladera.','La Gabriela','Medio','2026-11-06',-75.5521,6.3447,'Registrado'],
   ['BR-025','Erosión superficial','Erosión superficial y humedad persistente en borde de vía.','Niquía','Bajo','2026-11-02',-75.5588,6.3297,'Atendido']
  ];
  for(const r of seed){const q=await c.query(`INSERT INTO reports(code,user_id,category,description,sector,perceived_level,observed_at,location,status) VALUES($1,$2,$3,$4,$5,$6,$7,ST_SetSRID(ST_MakePoint($8,$9),4326)::geography,$10) RETURNING id`,[r[0],uid,r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8]]);await c.query('INSERT INTO report_history(report_id,user_id,status,note) VALUES($1,$2,$3,$4)',[q.rows[0].id,uid,r[8],'Registro de datos inicial para demostración.']);}
 }
 console.log('Datos iniciales creados.');
}finally{c.release();await pool.end();}})().catch(e=>{console.error(e);process.exit(1);});
