import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Menu, X, Mail, Phone, MapPin, Users, Trees, CalendarDays,
  LockKeyhole, ChevronRight, LogIn, LogOut, ShieldCheck, LoaderCircle, Plus, Trash2, Clock, Filter, BookOpen, Search, Pin, ExternalLink, MessageCircle, Send, Link2, ToggleLeft, ToggleRight, Pencil
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
  const [authMode, setAuthMode] = useState("login");
  const [recoveryMode, setRecoveryMode] = useState(false);
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

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setAuthView(true);
        setProfile(null);
      } else if (nextSession?.user) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setAuthView(false);
    setPrivatePage("dashboard");
    setMessage("Vous êtes déconnecté.");
    setTimeout(() => setMessage(""), 3000);
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
          <button className="login" onClick={() => { setPrivatePage("dashboard"); setAuthView(true); setOpen(false); }}>
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

    {recoveryMode ? (
      <ResetPasswordPage onDone={async () => { await supabase.auth.signOut(); setRecoveryMode(false); setAuthMode("login"); setAuthView(true); }} />
    ) : authView ? (
      activeUser ? (privatePage === "calendar" ? <CalendarPage profile={profile} onBack={() => setPrivatePage("dashboard")} /> : privatePage === "posts" ? <PostsPage profile={profile} onBack={() => setPrivatePage("dashboard")} /> : privatePage === "links" ? <UsefulLinksPage profile={profile} onBack={() => setPrivatePage("dashboard")} /> : privatePage === "admin-users" ? <AdminUsersPage profile={profile} onBack={() => setPrivatePage("dashboard")} /> : <MemberDashboard profile={profile} onLogout={signOut} openCalendar={() => setPrivatePage("calendar")} openPosts={() => setPrivatePage("posts")} openLinks={() => setPrivatePage("links")} openAdmin={() => setPrivatePage("admin-users")} />)
      : session && profile ? <PendingAccount profile={profile} onLogout={signOut} />
      : authMode === "register" ? <RegisterPage onBack={() => setAuthView(false)} onLogin={() => setAuthMode("login")} />
      : authMode === "forgot" ? <ForgotPasswordPage onBack={() => setAuthMode("login")} />
      : <LoginPage onBack={() => setAuthView(false)} onRegister={() => setAuthMode("register")} onForgot={() => setAuthMode("forgot")} />
    ) : (
      <PublicSite go={go} />
    )}

    {message && <div className="site-message" onClick={() => setMessage("")}>{message}</div>}
    <Footer />
  </>;
}

function LoginPage({ onBack, onRegister, onForgot }) {
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
      <button className="text-button forgot-button" onClick={onForgot}>Mot de passe oublié ?</button><button className="text-button" onClick={onRegister}>S'inscrire</button><button className="text-button secondary-back" onClick={onBack}>Retour au site public</button>
    </section>
  </main>;
}


function ForgotPasswordPage({ onBack }) {
  const [email,setEmail]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[sent,setSent]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);setError("");const {error:resetError}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});if(resetError)setError("Impossible d’envoyer l’e-mail de récupération. Réessayez plus tard.");else setSent(true);setBusy(false)}
  return <main className="auth-page"><section className="auth-card"><div className="auth-icon"><Mail/></div><h1>Mot de passe oublié</h1>{sent?<><p>Si un compte correspond à cette adresse, un e-mail de récupération vient d’être envoyé.</p><p>Vérifiez également les dossiers Spam et Promotions.</p><button className="primary auth-submit" onClick={onBack}>Retour à la connexion</button></>:<><p>Indiquez votre adresse e-mail pour recevoir un lien sécurisé.</p><form className="auth-form" onSubmit={submit}><label>Adresse e-mail<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>{error&&<p className="form-error">{error}</p>}<button className="primary auth-submit" disabled={busy}>{busy?"Envoi…":"Envoyer le lien"}</button></form><button className="text-button" onClick={onBack}>Retour à la connexion</button></>}</section></main>;
}

function ResetPasswordPage({ onDone }) {
  const [password,setPassword]=useState(""),[confirmation,setConfirmation]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
  async function submit(e){e.preventDefault();setError("");if(password.length<8){setError("Le mot de passe doit contenir au moins 8 caractères.");return}if(password!==confirmation){setError("Les deux mots de passe ne correspondent pas.");return}setBusy(true);const {error:updateError}=await supabase.auth.updateUser({password});if(updateError)setError("Le mot de passe n’a pas pu être modifié. Le lien est peut-être expiré.");else setDone(true);setBusy(false)}
  return <main className="auth-page"><section className="auth-card"><div className="auth-icon"><LockKeyhole/></div><h1>Nouveau mot de passe</h1>{done?<><p>Votre mot de passe a été modifié avec succès.</p><button className="primary auth-submit" onClick={onDone}>Se connecter</button></>:<><p>Choisissez un nouveau mot de passe d’au moins 8 caractères.</p><form className="auth-form" onSubmit={submit}><label>Nouveau mot de passe<input type="password" minLength="8" autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirmer le mot de passe<input type="password" minLength="8" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>{error&&<p className="form-error">{error}</p>}<button className="primary auth-submit" disabled={busy}>{busy?"Enregistrement…":"Enregistrer le nouveau mot de passe"}</button></form></>}</section></main>;
}

function RegisterPage({ onBack, onLogin }) {
  const [form,setForm]=useState({first_name:"",last_name:"",email:"",password:""});
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[sent,setSent]=useState(false);
  async function submit(e){
    e.preventDefault(); setBusy(true); setError("");
    if(form.password.length<8){setError("Le mot de passe doit contenir au moins 8 caractères.");setBusy(false);return}
    const {error:signupError}=await supabase.auth.signUp({
      email:form.email,password:form.password,
      options:{
        data:{first_name:form.first_name.trim(),last_name:form.last_name.trim()},
        emailRedirectTo:window.location.origin
      }
    });
    if(signupError)setError(signupError.message.includes("already registered")?"Cette adresse e-mail est déjà utilisée.":signupError.message);
    else setSent(true);
    setBusy(false);
  }
  if(sent)return <main className="auth-page"><section className="auth-card"><div className="auth-icon"><Mail/></div><h1>Vérifiez votre e-mail</h1><p>Un e-mail de confirmation a été envoyé à <strong>{form.email}</strong>.</p><p>Après confirmation, votre compte restera en attente jusqu’à sa validation par un administrateur.</p><button className="primary auth-submit" onClick={onLogin}>Retour à la connexion</button></section></main>;
  return <main className="auth-page"><section className="auth-card register-card"><div className="auth-icon"><Users/></div><h1>Demander un accès</h1><p>Créez votre compte. Un administrateur devra ensuite valider votre inscription.</p><form onSubmit={submit} className="auth-form"><div className="register-names"><label>Prénom<input required value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/></label><label>Nom<input required value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/></label></div><label>Adresse e-mail<input required type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Mot de passe<input required type="password" minLength="8" autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><small>Au moins 8 caractères. N’utilisez pas un mot de passe déjà employé ailleurs.</small>{error&&<p className="form-error">{error}</p>}<button className="primary auth-submit" disabled={busy}>{busy?"Création…":"Créer mon compte"}</button></form><button className="text-button" onClick={onLogin}>J’ai déjà un compte</button><button className="text-button secondary-back" onClick={onBack}>Retour au site public</button></section></main>;
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

function MemberDashboard({ profile, onLogout, openCalendar, openPosts, openLinks, openAdmin }) {
  const isAdmin = profile.role === "administrateur";
  return <main className="dashboard-page">
    <section className="dashboard-head">
      <div><span className="pill">Espace privé</span><h1>Bonjour {profile.first_name}</h1><p>Compte {isAdmin ? "administrateur" : "membre"} actif.</p></div>
      <button className="logout-button" onClick={onLogout}><LogOut size={18} /> Se déconnecter</button>
    </section>
    <section className="dashboard-grid">
      <article className="clickable-card" onClick={openCalendar}><CalendarDays /><h2>Calendrier et réservations</h2><p>Consulter et gérer les événements et réservations du local.</p><button className="card-link">Ouvrir <ChevronRight size={17} /></button></article>
      <article className="clickable-card" onClick={openPosts}><BookOpen /><h2>Espace administratif</h2><p>Consulter les tutoriels, procédures et informations de l’ASBL.</p><button className="card-link">Ouvrir <ChevronRight size={17} /></button></article>
      <article className="clickable-card" onClick={openLinks}><Link2 /><h2>Liens utiles</h2><p>Accéder rapidement aux outils, documents et ressources de l’ASBL.</p><button className="card-link">Ouvrir <ChevronRight size={17} /></button></article>
      {isAdmin && <article className="admin-card clickable-card" onClick={openAdmin}><ShieldCheck /><h2>Administration</h2><p>Valider les inscriptions et gérer les rôles et les accès.</p><button className="admin-card-link">Gérer les membres <ChevronRight size={17} /></button></article>}
    </section>
  </main>;
}



function UsefulLinksPage({ profile, onBack }) {
  const isAdmin=profile.role==="administrateur";
  const blank={title:"",description:"",url:"",icon:"link",display_order:0,is_active:true};
  const [links,setLinks]=useState([]),[showForm,setShowForm]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(blank),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  async function loadLinks(){setError("");const {data,error:loadError}=await supabase.from("useful_links").select("*").order("display_order").order("title");if(loadError)setError("Impossible de charger les liens : "+loadError.message);else setLinks(data||[])}
  useEffect(()=>{loadLinks()},[]);
  function startEdit(link){setEditing(link);setForm({title:link.title,description:link.description||"",url:link.url,icon:link.icon||"link",display_order:link.display_order,is_active:link.is_active});setShowForm(true);window.scrollTo({top:0,behavior:"smooth"})}
  function cancel(){setEditing(null);setForm(blank);setShowForm(false)}
  async function save(e){e.preventDefault();setBusy(true);setError("");const payload={...form,description:form.description||null,display_order:Number(form.display_order)||0,updated_at:new Date().toISOString()};let result;if(editing)result=await supabase.from("useful_links").update(payload).eq("id",editing.id);else{const {data:a}=await supabase.auth.getUser();result=await supabase.from("useful_links").insert({...payload,created_by:a.user.id})}if(result.error)setError("Enregistrement impossible : "+result.error.message);else{setNotice(editing?"Lien modifié.":"Lien ajouté.");cancel();await loadLinks()}setBusy(false)}
  async function toggle(link){const {error}=await supabase.from("useful_links").update({is_active:!link.is_active,updated_at:new Date().toISOString()}).eq("id",link.id);if(error)setError(error.message);else await loadLinks()}
  async function remove(link){if(!confirm(`Supprimer le lien « ${link.title} » ?`))return;const {error}=await supabase.from("useful_links").delete().eq("id",link.id);if(error)setError(error.message);else{setNotice("Lien supprimé.");await loadLinks()}}
  const shown=isAdmin?links:links.filter(l=>l.is_active);
  return <main className="links-page"><section className="links-head"><div><button className="text-button back-button" onClick={onBack}>← Retour au tableau de bord</button><span className="pill">Ressources</span><h1>Liens utiles</h1><p>Les outils et documents importants de l’ASBL au même endroit.</p></div>{isAdmin&&<button className="primary" onClick={()=>showForm?cancel():setShowForm(true)}><Plus size={18}/>Ajouter un lien</button>}</section>
  {notice&&<p className="calendar-notice">{notice}</p>}{error&&<p className="form-error calendar-error">{error}</p>}
  {showForm&&<section className="link-form-card"><h2>{editing?"Modifier le lien":"Ajouter un lien"}</h2><form className="link-form" onSubmit={save}><label>Titre<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>URL<input required type="url" placeholder="https://..." value={form.url} onChange={e=>setForm({...form,url:e.target.value})}/></label><label className="link-description">Description<textarea rows="3" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Ordre d’affichage<input type="number" min="0" value={form.display_order} onChange={e=>setForm({...form,display_order:e.target.value})}/></label><label className="check-label"><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/>Lien actif</label><div className="form-actions"><button type="button" className="logout-button" onClick={cancel}>Annuler</button><button className="primary" disabled={busy}>{busy?"Enregistrement…":editing?"Enregistrer les modifications":"Ajouter"}</button></div></form></section>}
  {!shown.length?<div className="empty-calendar"><Link2/><h2>Aucun lien utile</h2><p>Ajoutez la première ressource de l’ASBL.</p></div>:<section className="links-grid">{shown.map(link=><article className={`useful-link-card ${!link.is_active?"link-inactive":""}`} key={link.id}><div className="link-icon"><Link2/></div><div className="link-body"><div><h2>{link.title}</h2>{!link.is_active&&<span>Désactivé</span>}</div>{link.description&&<p>{link.description}</p>}<a href={link.url} target="_blank" rel="noreferrer">Ouvrir le lien <ExternalLink size={16}/></a></div>{isAdmin&&<div className="link-admin-actions"><button title="Modifier" onClick={()=>startEdit(link)}><Pencil size={17}/></button><button title={link.is_active?"Désactiver":"Activer"} onClick={()=>toggle(link)}>{link.is_active?<ToggleRight size={20}/>:<ToggleLeft size={20}/>}</button><button className="link-delete" title="Supprimer" onClick={()=>remove(link)}><Trash2 size={17}/></button></div>}</article>)}</section>}
  </main>;
}

function PostsPage({ profile, onBack }) {
  const isAdmin = profile.role === "administrateur";
  const categories = {subsides:"Subsides",etat_local:"État du local",assemblee_generale:"Assemblée générale",comptabilite:"Comptabilité",tuto_admin:"Tutoriels administratifs"};
  const blank = {title:"",category:"subsides",content:"",external_url:"",comments_enabled:false,pinned:false};
  const [posts,setPosts]=useState([]),[authors,setAuthors]=useState({}),[query,setQuery]=useState(""),[category,setCategory]=useState("toutes"),[showForm,setShowForm]=useState(false),[selected,setSelected]=useState(null),[editing,setEditing]=useState(null),[form,setForm]=useState(blank),[busy,setBusy]=useState(false),[loadingPosts,setLoadingPosts]=useState(true),[commentCounts,setCommentCounts]=useState({}),[comments,setComments]=useState([]),[commentAuthors,setCommentAuthors]=useState({}),[commentText,setCommentText]=useState(""),[commentsBusy,setCommentsBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  async function loadPosts(){setLoadingPosts(true);setError("");const {data,error:postError}=await supabase.from("posts").select("*").order("pinned",{ascending:false}).order("created_at",{ascending:false});if(postError){setError("Impossible de charger les publications : "+postError.message);setLoadingPosts(false);return}setPosts(data||[]);const ids=[...new Set((data||[]).map(p=>p.author_id))];if(ids.length){const {data:profiles}=await supabase.from("profiles").select("id,first_name,last_name").in("id",ids);const map={};(profiles||[]).forEach(a=>map[a.id]=`${a.first_name} ${a.last_name}`);setAuthors(map)}const publishedIds=(data||[]).filter(p=>p.status==="publie"&&p.comments_enabled).map(p=>p.id);if(publishedIds.length){const {data:commentRows}=await supabase.from("comments").select("post_id").in("post_id",publishedIds);const counts={};publishedIds.forEach(id=>counts[id]=0);(commentRows||[]).forEach(row=>counts[row.post_id]=(counts[row.post_id]||0)+1);setCommentCounts(counts)}else setCommentCounts({});setLoadingPosts(false)}
  useEffect(()=>{loadPosts()},[]);
  async function savePost(e){e.preventDefault();setBusy(true);setError("");setNotice("");const {data:a}=await supabase.auth.getUser();if(editing){const payload={title:form.title,category:form.category,content:form.content,external_url:form.external_url||null,comments_enabled:form.comments_enabled,pinned:isAdmin?form.pinned:false,updated_at:new Date().toISOString()};const {error:saveError}=await supabase.from("posts").update(payload).eq("id",editing.id);if(saveError)setError("Modification impossible : "+saveError.message);else{setNotice("Publication modifiée.");setEditing(null);setSelected(null);setForm(blank);setShowForm(false);await loadPosts()}}else{const payload={...form,external_url:form.external_url||null,attachment_url:null,author_id:a.user.id,status:isAdmin?"publie":"en_attente",published_at:isAdmin?new Date().toISOString():null,pinned:isAdmin?form.pinned:false};const {error:saveError}=await supabase.from("posts").insert(payload);if(saveError)setError("Publication impossible : "+saveError.message);else{setNotice(isAdmin?"Publication créée.":"Proposition envoyée pour validation.");setForm(blank);setShowForm(false);await loadPosts()}}setBusy(false)}
  function startEdit(post){setEditing(post);setForm({title:post.title,category:post.category,content:post.content,external_url:post.external_url||"",comments_enabled:post.comments_enabled,pinned:post.pinned});setSelected(null);setShowForm(true);window.scrollTo({top:0,behavior:"smooth"})}
  function cancelForm(){setEditing(null);setForm(blank);setShowForm(false)}
  async function updatePost(id,changes,label){setError("");const payload={...changes,updated_at:new Date().toISOString()};if(changes.status==="publie")payload.published_at=new Date().toISOString();const {error:updateError}=await supabase.from("posts").update(payload).eq("id",id);if(updateError)setError("Modification impossible : "+updateError.message);else{setNotice(label);setSelected(null);await loadPosts()}}
  async function removePost(id){if(!confirm("Supprimer définitivement cette publication ?"))return;const {error:deleteError}=await supabase.from("posts").delete().eq("id",id);if(deleteError)setError(deleteError.message);else{setNotice("Publication supprimée.");setSelected(null);await loadPosts()}}
  async function openPost(post){setSelected(post);setComments([]);setCommentText("");if(post.comments_enabled&&post.status==="publie")await loadComments(post.id)}
  async function loadComments(postId){const {data,error:commentsError}=await supabase.from("comments").select("*").eq("post_id",postId).order("created_at",{ascending:true});if(commentsError){setError("Impossible de charger les commentaires : "+commentsError.message);return}setComments(data||[]);const ids=[...new Set((data||[]).map(c=>c.author_id))];if(ids.length){const {data:profiles}=await supabase.from("profiles").select("id,first_name,last_name").in("id",ids);const map={};(profiles||[]).forEach(a=>map[a.id]=`${a.first_name} ${a.last_name}`);setCommentAuthors(map)}setCommentCounts(current=>({...current,[postId]:(data||[]).length}))}
  async function addComment(e){e.preventDefault();if(!commentText.trim())return;setCommentsBusy(true);const {data:a}=await supabase.auth.getUser();const {error:commentError}=await supabase.from("comments").insert({post_id:selected.id,author_id:a.user.id,content:commentText.trim()});if(commentError)setError("Commentaire impossible : "+commentError.message);else{setCommentText("");await loadComments(selected.id)}setCommentsBusy(false)}
  async function deleteComment(comment){if(!confirm("Supprimer ce commentaire ?"))return;const {error:deleteError}=await supabase.from("comments").delete().eq("id",comment.id);if(deleteError)setError("Suppression impossible : "+deleteError.message);else await loadComments(selected.id)}
  const visible=posts.filter(p=>(category==="toutes"||p.category===category)&&(p.title.toLowerCase().includes(query.toLowerCase())||p.content.toLowerCase().includes(query.toLowerCase())));
  return <main className="posts-page"><section className="posts-head"><div><button className="text-button back-button" onClick={onBack}>← Retour au tableau de bord</button><span className="pill">Base de connaissances</span><h1>Espace administratif</h1><p>Tutoriels, procédures, modèles et informations utiles.</p></div><button className="primary" onClick={()=>{if(showForm)cancelForm();else{setEditing(null);setForm(blank);setShowForm(true)}}}><Plus size={18}/>{isAdmin?" Nouvelle publication":" Proposer un tutoriel"}</button></section>
  {notice&&<p className="calendar-notice">{notice}</p>}{error&&<p className="form-error calendar-error">{error}</p>}
  {showForm&&<section className="post-form-card"><h2>{editing?"Modifier la publication":isAdmin?"Créer une publication":"Proposer un tutoriel"}</h2><form className="post-form" onSubmit={savePost}><label>Titre<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Catégorie<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{Object.entries(categories).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="post-content-field">Contenu<textarea required rows="9" value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label><label>Lien externe facultatif<input type="url" placeholder="https://..." value={form.external_url} onChange={e=>setForm({...form,external_url:e.target.value})}/></label><label className="check-label"><input type="checkbox" checked={form.comments_enabled} onChange={e=>setForm({...form,comments_enabled:e.target.checked})}/> Autoriser les commentaires</label>{isAdmin&&<label className="check-label"><input type="checkbox" checked={form.pinned} onChange={e=>setForm({...form,pinned:e.target.checked})}/> Épingler la publication</label>}<div className="form-actions"><button type="button" className="logout-button" onClick={cancelForm}>Annuler</button><button className="primary" disabled={busy}>{busy?"Enregistrement…":editing?"Enregistrer les modifications":isAdmin?"Publier":"Envoyer pour validation"}</button></div></form></section>}
  <section className="posts-toolbar"><div className="search-box"><Search size={18}/><input placeholder="Rechercher..." value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={category} onChange={e=>setCategory(e.target.value)}><option value="toutes">Toutes les catégories</option>{Object.entries(categories).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></section>
  {loadingPosts?<div className="calendar-loading"><LoaderCircle className="spin"/> Chargement…</div>:!visible.length?<div className="empty-calendar"><BookOpen/><h2>Aucune publication</h2><p>Créez la première publication de l’ASBL.</p></div>:<section className="posts-grid">{visible.map(post=><article className="post-card" key={post.id} onClick={()=>openPost(post)}>{post.pinned&&<Pin className="post-pin" size={18}/>} {post.status==="publie"&&post.comments_enabled&&<span className="comment-count" title={`${commentCounts[post.id]||0} commentaire(s)`}><MessageCircle size={15}/>{commentCounts[post.id]||0}</span>}<span className={`post-status post-status-${post.status}`}>{post.status==="publie"?"Publié":post.status==="en_attente"?"En attente":post.status}</span><small>{categories[post.category]}</small><h2>{post.title}</h2><p>{post.content}</p><footer><span>{authors[post.author_id]||"Auteur"}</span><span>{new Date(post.published_at||post.created_at).toLocaleDateString("fr-BE")}</span></footer></article>)}</section>}
  {selected&&<div className="post-modal-backdrop" onClick={()=>setSelected(null)}><article className="post-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}>×</button><span className="post-status">{categories[selected.category]}</span><h1>{selected.title}</h1><p className="post-by">Par {authors[selected.author_id]||"Auteur"} · {new Date(selected.published_at||selected.created_at).toLocaleDateString("fr-BE")}</p><div className="post-full-content">{selected.content}</div>{selected.external_url&&<a className="external-post-link" href={selected.external_url} target="_blank" rel="noreferrer"><ExternalLink size={17}/>Ouvrir le lien associé</a>}{selected.comments_enabled&&selected.status==="publie"&&<section className="comments-section"><h2><MessageCircle size={20}/>Commentaires</h2><div className="comments-list">{comments.length?comments.map(comment=><article className="comment-item" key={comment.id}><div><strong>{commentAuthors[comment.author_id]||"Membre"}</strong><small>{new Date(comment.created_at).toLocaleString("fr-BE")}</small></div><p>{comment.content}</p>{(isAdmin||comment.author_id===profile.id)&&<button className="delete-comment" onClick={()=>deleteComment(comment)}><Trash2 size={15}/>Supprimer</button>}</article>):<p className="no-comments">Aucun commentaire pour le moment.</p>}</div><form className="comment-form" onSubmit={addComment}><textarea rows="3" maxLength="2000" placeholder="Écrire un commentaire..." value={commentText} onChange={e=>setCommentText(e.target.value)} required/><button className="primary" disabled={commentsBusy}><Send size={17}/>{commentsBusy?"Envoi…":"Publier"}</button></form></section>}{isAdmin&&<div className="post-admin-actions"><button className="edit-post" onClick={()=>startEdit(selected)}>Modifier</button>{selected.status==="en_attente"&&<><button className="approve-button" onClick={()=>updatePost(selected.id,{status:"publie"},"Proposition approuvée.")}>Approuver</button><button className="reject-button" onClick={()=>updatePost(selected.id,{status:"refuse"},"Proposition refusée.")}>Refuser</button></>}<button className="logout-button" onClick={()=>updatePost(selected.id,{pinned:!selected.pinned},selected.pinned?"Publication désépinglée.":"Publication épinglée.")}><Pin size={16}/>{selected.pinned?"Désépingler":"Épingler"}</button><button className="delete-post" onClick={()=>removePost(selected.id)}><Trash2 size={17}/>Supprimer</button></div>}</article></div>}
  </main>;
}

function AdminUsersPage({ profile, onBack }) {
  const [users,setUsers]=useState([]),[filter,setFilter]=useState("tous"),[loadingUsers,setLoadingUsers]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
  async function loadUsers(){setLoadingUsers(true);setError("");const {data,error:loadError}=await supabase.from("profiles").select("id,first_name,last_name,email,role,status,created_at").order("created_at",{ascending:false});if(loadError)setError("Impossible de charger les utilisateurs : "+loadError.message);else setUsers(data||[]);setLoadingUsers(false)}
  useEffect(()=>{loadUsers()},[]);
  async function updateUser(id,changes,label){setError("");setNotice("");const {error:updateError}=await supabase.from("profiles").update({...changes,updated_at:new Date().toISOString()}).eq("id",id);if(updateError)setError("Modification impossible : "+updateError.message);else{setNotice(label);await loadUsers()}}
  const labels={en_attente:"En attente",actif:"Actif",desactive:"Désactivé",refuse:"Refusé"};
  const visible=filter==="tous"?users:users.filter(user=>user.status===filter);
  return <main className="admin-users-page"><section className="admin-users-head"><div><button className="text-button back-button" onClick={onBack}>← Retour au tableau de bord</button><span className="pill">Administration</span><h1>Gestion des membres</h1><p>Validez les inscriptions et gérez les accès au portail.</p></div><div className="admin-count"><strong>{users.filter(u=>u.status==="en_attente").length}</strong><span>en attente</span></div></section>
  {notice&&<p className="calendar-notice">{notice}</p>}{error&&<p className="form-error calendar-error">{error}</p>}
  <section className="users-toolbar"><label>Filtrer par statut</label><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="tous">Tous les comptes</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><span>{visible.length} compte{visible.length>1?"s":""}</span></section>
  {loadingUsers?<div className="calendar-loading"><LoaderCircle className="spin"/> Chargement…</div>:<section className="users-list">{visible.map(user=><article className="user-row" key={user.id}><div className="user-avatar">{user.first_name?.[0]}{user.last_name?.[0]}</div><div className="user-main"><h2>{user.first_name} {user.last_name}</h2><p>{user.email}</p><small>Inscrit le {new Date(user.created_at).toLocaleDateString("fr-BE")}</small></div><span className={`status-badge status-${user.status}`}>{labels[user.status]}</span><label className="role-select">Rôle<select value={user.role} disabled={user.id===profile.id} onChange={e=>updateUser(user.id,{role:e.target.value},"Rôle mis à jour.")}><option value="membre">Membre</option><option value="administrateur">Administrateur</option></select></label><div className="user-actions">{user.status==="en_attente"&&<><button className="approve-button" onClick={()=>updateUser(user.id,{status:"actif"},"Inscription validée.")}>Valider</button><button className="reject-button" onClick={()=>updateUser(user.id,{status:"refuse"},"Inscription refusée.")}>Refuser</button></>}{user.status==="actif"&&user.id!==profile.id&&<button className="disable-button" onClick={()=>updateUser(user.id,{status:"desactive"},"Compte désactivé.")}>Désactiver</button>}{(user.status==="desactive"||user.status==="refuse")&&<button className="approve-button" onClick={()=>updateUser(user.id,{status:"actif"},"Compte réactivé.")}>Réactiver</button>}{user.id===profile.id&&<small className="self-label">Votre compte</small>}</div></article>)}</section>}
  {!loadingUsers&&!visible.length&&<div className="empty-calendar"><Users/><h2>Aucun compte</h2><p>Aucun utilisateur ne correspond à ce filtre.</p></div>}
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
    <section id="accueil" className="hero"><div><span className="pill">ASBL active à Tihange</span><h1>Un lieu pour grandir, partager et s’engager.</h1><p>L’ASBL Patro Vieux soutient le Patro de Tihange, entretient ses locaux et contribue à la pérennité du mouvement pour les générations futures.</p><div className="buttons"><button className="primary" onClick={() => go("histoire")}>Découvrir notre histoire <ChevronRight size={18} /></button><a className="secondary" href={`mailto:${INFO.email}`}><Mail size={18} /> Nous contacter</a></div></div><div className="hero-logo"><Logo /></div></section>
    <section id="actions" className="section"><div className="heading"><span>Nos actions</span><h2>Faire vivre le mouvement dans un cadre durable</h2></div><div className="cards"><article><Users /><h3>Accueil des jeunes</h3><p>Le Patro accueille les enfants et les jeunes de 4 à 18 ans autour d’animations et de projets collectifs.</p></article><article><Trees /><h3>Vie en groupe et nature</h3><p>Les activités développent l’autonomie, la coopération et le lien avec la nature.</p></article><article><CalendarDays /><h3>Gestion du local</h3><p>L’ASBL entretient les bâtiments et soutient leur équilibre financier, notamment grâce à la location.</p></article></div></section>
    <section id="histoire" className="story"><div><span>Notre histoire</span><h2>Depuis 1997, un lieu pour grandir ensemble</h2></div><div><p>Fondé en 1997, le Patro de Tihange accueille les enfants et les jeunes de 4 à 18 ans. À travers des animations, des activités en plein air et des projets collectifs, le mouvement leur permet de découvrir la vie en groupe, de développer leur autonomie et de créer un lien privilégié avec la nature.</p><p>En 2017, à l’occasion des 20 ans du Patro, d’anciens membres ont fondé l’ASBL Patro Vieux. Leur objectif était de rénover les locaux, devenus vétustes et moins adaptés à l’accueil des enfants.</p><p>Ces rénovations ont aujourd’hui bien abouti. L’ASBL poursuit désormais un nouvel objectif : assurer l’équilibre financier du local, notamment grâce à sa mise en location, afin d’entretenir durablement les bâtiments et de permettre au mouvement de perdurer pour les générations futures.</p></div></section>
    <section id="contact" className="section contact"><div className="heading"><span>Contact</span><h2>Contacter l’ASBL Patro Vieux</h2></div><div className="contact-grid"><div className="details"><p><MapPin /> {INFO.address}</p><p><Mail /><a href={`mailto:${INFO.email}`}>{INFO.email}</a></p><p><Phone /><a href={`tel:${INFO.phoneLink}`}>{INFO.phone}</a></p><p><Users /> Président : {INFO.president}</p><p className="legal">N° d’entreprise : {INFO.company}</p></div><form action={`mailto:${INFO.email}`} method="post" encType="text/plain"><label>Nom<input name="nom" required /></label><label>Adresse e-mail<input name="email" type="email" required /></label><label>Message<textarea name="message" rows="5" required /></label><button className="primary" type="submit"><Mail size={18} /> Préparer l’e-mail</button></form></div></section>
  </main>;
}

function Footer() {
  return <><footer><div><Logo /><p>Une ASBL engagée auprès des jeunes et du Patro de Tihange.</p></div><div><strong>Coordonnées</strong><p>{INFO.address}</p><a href={`mailto:${INFO.email}`}>{INFO.email}</a><br /><a href={`tel:${INFO.phoneLink}`}>{INFO.phone}</a></div><div><strong>Informations légales</strong><p>ASBL PATRO VIEUX</p><p>N° d’entreprise : {INFO.company}</p><p>Président : {INFO.president}</p></div></footer><div className="copyright">© 2026 ASBL Patro Vieux · Grande Route 86, 4500 Huy</div></>;
}

createRoot(document.getElementById("root")).render(<App />);




