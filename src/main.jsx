import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Menu, X, Mail, Phone, MapPin, Users, Trees, CalendarDays,
  LockKeyhole, ChevronRight, LogIn, LogOut, ShieldCheck, LoaderCircle, Plus, Trash2, Clock, Filter
} from "lucide-react";
import { supabase } from "./supabase";
import "./style.css";

const INFO = {
  email: "asblpatrovieux@gmail.com",
  phone: "0455 12 37 99",
  phoneLink: "+32455123799",
  address: "Grande Route 86, 4500 Huy",
  company: "0668.969.606",
  president: "Preser Thomas"
};

function Logo() {
  return <img className="logo" src="/logo-patro-vieux.png" alt="Patro Vieux - Grandir, partager, s’engager" />;
}

function App() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authView, setAuthView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [privatePage, setPrivatePage] = useState("dashboard");

  const go = (id) => {
    setOpen(false);
    setAuthView(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name,last_name,email,role,status")
      .eq("id", userId)
      .single();

    if (error) {
      setMessage("Impossible de charger le profil : " + error.message);
      setProfile(null);
      return;
    }
    setProfile(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) await loadProfile(nextSession.user.id);
      else setProfile(null);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setAuthView(false);
    setMessage("Vous êtes déconnecté.");
  }

  if (loading) {
    return <div className="loading-screen"><LoaderCircle className="spin" /><p>Chargement du portail…</p></div>;
  }

  const activeUser = session && profile?.status === "actif";

  return <>
    <header>
      <button className="brand" onClick={() => go("accueil")}><Logo /></button>
      <nav className={open ? "open" : ""}>
        <button onClick={() => go("accueil")}>Accueil</button>
        <button onClick={() => go("histoire")}>Notre histoire</button>
        <button onClick={() => go("actions")}>Nos actions</button>
        <button onClick={() => go("contact")}>Contact</button>
        {activeUser ? (
          <button className="login" onClick={() => setAuthView(true)}>
            <ShieldCheck size={17} /> Espace membre
          </button>
        ) : (
          <button className="login" onClick={() => { setOpen(false); setAuthView(true); }}>
            <LogIn size={17} /> Accès membre
          </button>
        )}
      </nav>
      <button className="menu" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </header>

    {authView ? (
      activeUser ? (privatePage === "calendar" ? <CalendarPage profile={profile} onBack={() => setPrivatePage("dashboard")} /> : <MemberDashboard profile={profile} onLogout={signOut} openCalendar={() => setPrivatePage("calendar")} />)
      : session && profile ? <PendingAccount profile={profile} onLogout={signOut} />
      : <LoginPage onBack={() => setAuthView(false)} />
    ) : (
      <PublicSite go={go} />
    )}

    {message && <div className="site-message" onClick={() => setMessage("")}>{message}</div>}
    <Footer />
  </>;
}

function LoginPage({ onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) setError("Adresse e-mail ou mot de passe incorrect.");
    setBusy(false);
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-icon"><LockKeyhole /></div>
      <h1>Accès membre</h1>
      <p>Connectez-vous à l’espace privé de l’ASBL Patro Vieux.</p>
      <form onSubmit={submit} className="auth-form">
        <label>Adresse e-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>Mot de passe<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary auth-submit" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
      </form>
      <button className="text-button" onClick={onBack}>Retour au site public</button>
    </section>
  </main>;
}

function PendingAccount({ profile, onLogout }) {
  const labels = { en_attente: "en attente de validation", desactive: "désactivé", refuse: "refusé" };
  return <main className="auth-page"><section className="auth-card">
    <div className="auth-icon"><LockKeyhole /></div>
    <h1>Accès non disponible</h1>
    <p>Bonjour {profile.first_name}. Votre compte est actuellement <strong>{labels[profile.status] || profile.status}</strong>.</p>
    <p>Contactez l’ASBL si cette situation semble incorrecte.</p>
    <button className="primary auth-submit" onClick={onLogout}><LogOut size={17} /> Se déconnecter</button>
  </section></main>;
}

function MemberDashboard({ profile, onLogout, openCalendar }) {
  const isAdmin = profile.role === "administrateur";
  return <main className="dashboard-page">
    <section className="dashboard-head">
      <div><span className="pill">Espace privé</span><h1>Bonjour {profile.first_name}</h1><p>Compte {isAdmin ? "administrateur" : "membre"} actif.</p></div>
      <button className="logout-button" onClick={onLogout}><LogOut size={18} /> Se déconnecter</button>
    </section>
    <section className="dashboard-grid">
      <article className="clickable-card" onClick={openCalendar}><CalendarDays /><h2>Calendrier et réservations</h2><p>Consulter et gérer les événements et réservations du local.</p><button className="card-link">Ouvrir <ChevronRight size={17} /></button></article>
      <article><Users /><h2>Espace administratif</h2><p>Les publications et procédures seront reliées à Supabase prochainement.</p></article>
      <article><ChevronRight /><h2>Liens utiles</h2><p>Les liens administrables seront affichés depuis la base de données.</p></article>
      {isAdmin && <article className="admin-card"><ShieldCheck /><h2>Administration</h2><p>Ton rôle administrateur est bien reconnu par le site.</p></article>}
    </section>
  </main>;
}

function CalendarPage({ profile, onBack }) {
  const isAdmin = profile.role === "administrateur";
  const now = new Date();
  const pad = n => String(n).padStart(2,"0");
  const localValue = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const initialStart = new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,9,0);
  const blank = {title:"",start_at:localValue(initialStart),end_at:localValue(new Date(initialStart.getTime()+3600000)),location:"Local Patro",category:"reservation",description:"",organizer:`${profile.first_name} ${profile.last_name}`};
  const [events,setEvents]=useState([]),[filter,setFilter]=useState("tous"),[view,setView]=useState("month"),[month,setMonth]=useState(new Date(now.getFullYear(),now.getMonth(),1)),[show,setShow]=useState(false),[form,setForm]=useState(blank),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const labels={reservation:"Réservation",evenement:"Événement",reunion:"Réunion",activite:"Activité",indisponibilite:"Indisponibilité"};
  async function load(){const {data,error}=await supabase.from("events").select("*").order("start_at");if(error)setError(error.message);else setEvents(data||[])}
  useEffect(()=>{load()},[]);
  async function save(e){e.preventDefault();setBusy(true);setError("");const {data:a}=await supabase.auth.getUser();const payload={...form,start_at:new Date(form.start_at).toISOString(),end_at:new Date(form.end_at).toISOString(),created_by:a.user.id};const {error:x}=await supabase.from("events").insert(payload);if(x)setError(x.code==="23P01"?"Cette réservation chevauche une réservation ou une indisponibilité existante.":x.code==="23514"?"La fin doit être postérieure au début.":x.message);else{setNotice("Événement enregistré.");setShow(false);setForm(blank);await load()}setBusy(false)}
  async function remove(id){if(!confirm("Supprimer définitivement cet événement ?"))return;const {error}=await supabase.from("events").delete().eq("id",id);if(error)setError(error.message);else{setNotice("Événement supprimé.");await load()}}
  const shown=filter==="tous"?events:events.filter(e=>e.category===filter);
  const inDay=(e,d)=>{const s=new Date(e.start_at),end=new Date(e.end_at),ds=new Date(d.getFullYear(),d.getMonth(),d.getDate()),de=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);return s<de&&end>ds};
  const first=new Date(month.getFullYear(),month.getMonth(),1), offset=(first.getDay()+6)%7, days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const cells=[...Array(offset).fill(null),...Array.from({length:days},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i+1))];while(cells.length%7)cells.push(null);
  return <main className="calendar-page"><section className="calendar-head"><div><button className="text-button back-button" onClick={onBack}>← Retour au tableau de bord</button><span className="pill">Espace privé</span><h1>Calendrier et réservations</h1><p>Consultez les activités et les disponibilités du local.</p></div>{isAdmin&&<button className="primary" onClick={()=>{setShow(!show);setError("")}}><Plus size={18}/> Ajouter un événement</button>}</section>
  {notice&&<p className="calendar-notice">{notice}</p>}{error&&<p className="form-error calendar-error">{error}</p>}
  {show&&<section className="event-form-card"><h2>Nouvel événement</h2><form className="event-form" onSubmit={save}><label>Titre<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Catégorie<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Début<input required type="datetime-local" value={form.start_at} onChange={e=>setForm({...form,start_at:e.target.value})}/></label><label>Fin<input required type="datetime-local" value={form.end_at} onChange={e=>setForm({...form,end_at:e.target.value})}/></label><label>Lieu<input required value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label><label>Organisateur<input required value={form.organizer} onChange={e=>setForm({...form,organizer:e.target.value})}/></label><label className="full-field">Description<textarea rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="form-actions"><button type="button" className="logout-button" onClick={()=>setShow(false)}>Annuler</button><button className="primary" disabled={busy}>{busy?"Enregistrement…":"Enregistrer"}</button></div></form></section>}
  <section className="calendar-toolbar"><div className="view-buttons"><button className={view==="month"?"active-view":""} onClick={()=>setView("month")}>Vue calendrier</button><button className={view==="list"?"active-view":""} onClick={()=>setView("list")}>Vue liste</button></div><div><Filter size={18}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="tous">Toutes les catégories</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div></section>
  {view==="month"?<><section className="month-nav"><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button><h2>{month.toLocaleDateString("fr-BE",{month:"long",year:"numeric"})}</h2><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></section><section className="month-grid"><div className="weekdays">{"Lun Mar Mer Jeu Ven Sam Dim".split(" ").map(x=><span key={x}>{x}</span>)}</div><div className="days-grid">{cells.map((d,i)=><div key={i} className={`day-cell ${!d?"outside":""}`}>{d&&<><strong>{d.getDate()}</strong><div className="day-events">{shown.filter(e=>inDay(e,d)).map(e=><div key={e.id} className={`mini-event mini-${e.category}`} title={`${e.title} — ${new Date(e.start_at).toLocaleString("fr-BE")} au ${new Date(e.end_at).toLocaleString("fr-BE")}`}>{e.title}</div>)}</div></>}</div>)}</div></section></>:!shown.length?<div className="empty-calendar"><CalendarDays/><h2>Aucun événement</h2></div>:<section className="event-list">{shown.map(e=><article key={e.id} className={`event-item event-${e.category}`}><div className="event-date"><strong>{new Date(e.start_at).getDate()}</strong><span>{new Date(e.start_at).toLocaleDateString("fr-BE",{month:"short"})}</span></div><div className="event-info"><span className="event-category">{labels[e.category]}</span><h2>{e.title}</h2><div className="event-meta"><span><CalendarDays size={16}/>{new Date(e.start_at).toLocaleString("fr-BE",{dateStyle:"full",timeStyle:"short"})} → {new Date(e.end_at).toLocaleString("fr-BE",{dateStyle:"full",timeStyle:"short"})}</span><span><MapPin size={16}/>{e.location}</span></div>{e.description&&<p>{e.description}</p>}<small>Organisé par {e.organizer}</small></div>{isAdmin&&<button className="delete-event" onClick={()=>remove(e.id)}><Trash2 size={19}/></button>}</article>)}</section>}</main>;
}


function PublicSite({ go }) {
  return <main>
    <section id="accueil" className="hero"><div><span className="pill">ASBL active à Tihange</span><h1>Un lieu pour grandir, partager et s’engager.</h1><p>L’ASBL Patro Vieux soutient le Patro de Tihange, entretient ses locaux et contribue à la pérennité du mouvement pour les générations futures.</p><div className="buttons"><button className="primary" onClick={() => go("histoire")}>Découvrir notre histoire <ChevronRight size={18} /></button><a className="secondary" href={`mailto:${INFO.email}`}><Mail size={18} /> Nous contacter</a></div></div><div className="hero-logo"><Logo /><p>Patro des Ti-Loups de Tihange</p></div></section>
    <section id="actions" className="section"><div className="heading"><span>Nos actions</span><h2>Faire vivre le mouvement dans un cadre durable</h2></div><div className="cards"><article><Users /><h3>Accueil des jeunes</h3><p>Le Patro accueille les enfants et les jeunes de 4 à 18 ans autour d’animations et de projets collectifs.</p></article><article><Trees /><h3>Vie en groupe et nature</h3><p>Les activités développent l’autonomie, la coopération et le lien avec la nature.</p></article><article><CalendarDays /><h3>Gestion du local</h3><p>L’ASBL entretient les bâtiments et soutient leur équilibre financier, notamment grâce à la location.</p></article></div></section>
    <section id="histoire" className="story"><div><span>Notre histoire</span><h2>Depuis 1997, un lieu pour grandir ensemble</h2></div><div><p>Fondé en 1997, le Patro de Tihange accueille les enfants et les jeunes de 4 à 18 ans. À travers des animations, des activités en plein air et des projets collectifs, le mouvement leur permet de découvrir la vie en groupe, de développer leur autonomie et de créer un lien privilégié avec la nature.</p><p>En 2017, à l’occasion des 20 ans du Patro, d’anciens membres ont fondé l’ASBL Patro Vieux. Leur objectif était de rénover les locaux, devenus vétustes et moins adaptés à l’accueil des enfants.</p><p>Ces rénovations ont aujourd’hui bien abouti. L’ASBL poursuit désormais un nouvel objectif : assurer l’équilibre financier du local, notamment grâce à sa mise en location, afin d’entretenir durablement les bâtiments et de permettre au mouvement de perdurer pour les générations futures.</p></div></section>
    <section id="contact" className="section contact"><div className="heading"><span>Contact</span><h2>Contacter l’ASBL Patro Vieux</h2></div><div className="contact-grid"><div className="details"><p><MapPin /> {INFO.address}</p><p><Mail /><a href={`mailto:${INFO.email}`}>{INFO.email}</a></p><p><Phone /><a href={`tel:${INFO.phoneLink}`}>{INFO.phone}</a></p><p><Users /> Président : {INFO.president}</p><p className="legal">N° d’entreprise : {INFO.company}</p></div><form action={`mailto:${INFO.email}`} method="post" encType="text/plain"><label>Nom<input name="nom" required /></label><label>Adresse e-mail<input name="email" type="email" required /></label><label>Message<textarea name="message" rows="5" required /></label><button className="primary" type="submit"><Mail size={18} /> Préparer l’e-mail</button></form></div></section>
  </main>;
}

function Footer() {
  return <><footer><div><Logo /><p>Une ASBL engagée auprès des jeunes et du Patro de Tihange.</p></div><div><strong>Coordonnées</strong><p>{INFO.address}</p><a href={`mailto:${INFO.email}`}>{INFO.email}</a><br /><a href={`tel:${INFO.phoneLink}`}>{INFO.phone}</a></div><div><strong>Informations légales</strong><p>ASBL PATRO VIEUX</p><p>N° d’entreprise : {INFO.company}</p><p>Président : {INFO.president}</p></div></footer><div className="copyright">© 2026 ASBL Patro Vieux · Grande Route 86, 4500 Huy</div></>;
}

createRoot(document.getElementById("root")).render(<App />);

