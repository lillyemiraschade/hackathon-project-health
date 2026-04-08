import { useState, useEffect, useRef } from 'react';
import {
  Home as HomeIcon, Pill, Phone as PhoneIcon, Check, ChevronRight,
  MicOff, PhoneOff, Volume2, Globe, AlertTriangle, Sparkles, Heart,
  Activity, ArrowRight, FileText, Battery, Wifi, Signal,
  Footprints, BookOpen, Languages,
  Lightbulb, Zap, Clock
} from 'lucide-react';
import { api, connectPatientWS, getSavedToken, getSavedPatientId, saveSession, clearSession } from './api';

const NOTES: Record<string, Record<string, { original: string; literal: string; cultural: string; why: string }>> = {
  stage1: {
    en: { original: 'Stage 1 hypertension', literal: 'Hipertensi\u00f3n de etapa 1', cultural: 'In U.S. medicine, "stage 1" is not "the mild kind you can ignore." Your blood pressure is already high enough to damage your heart and kidneys over time.', why: 'Many patients hear "stage 1" and think it can wait. The damage happens silently.' },
    es: { original: 'Stage 1 hypertension', literal: 'Hipertensi\u00f3n de etapa 1', cultural: 'En la medicina de EE.UU., "etapa 1" no significa "la leve que puedes ignorar." Tu presi\u00f3n ya es lo suficientemente alta como para da\u00f1ar tu coraz\u00f3n y ri\u00f1ones.', why: 'Muchos pacientes escuchan "etapa 1" y piensan que puede esperar. El da\u00f1o ocurre en silencio.' }
  },
  takeDaily: {
    en: { original: 'Take one tablet every morning', literal: 'Tomar una tableta cada ma\u00f1ana', cultural: '"Every morning" means at the same time each day \u2014 not "when you remember." Skipping a day lets your pressure spike right back up.', why: 'This is the #1 reason patients end up back in the hospital.' },
    es: { original: 'Take one tablet every morning', literal: 'Tomar una tableta cada ma\u00f1ana', cultural: '"Cada ma\u00f1ana" significa a la misma hora cada d\u00eda \u2014 no "cuando te acuerdes." Saltarte un d\u00eda hace que tu presi\u00f3n suba otra vez.', why: 'Esta es la raz\u00f3n #1 por la que los pacientes regresan al hospital.' }
  },
};

const T: Record<string, Record<string, any>> = {
  es: {
    greeting:'Buenos d\u00edas',name:'Isa',subtitle:'Veamos c\u00f3mo te sientes hoy.',
    careDay:'D\u00eda 3 de 14 \u00b7 Dr. Reyes',upcoming:'Pr\u00f3xima llamada',
    upcomingTime:'Hoy \u00b7 6:00 p.m.',startCall:'Empezar revisi\u00f3n',
    callSub:'Revisi\u00f3n del d\u00eda 3, en tu idioma',quick:'Acciones r\u00e1pidas',
    reportSymptom:'Reportar s\u00edntoma',openDocs:'Ver mis documentos',
    newMessage:'Mensaje del Dr. Reyes',msgPreview:'Gracias por los datos de ayer. Todo se ve bien.',
    ago:'hace 1 h',missionTag:'Traducido con contexto cultural',
    todayTasks:'Hoy',done:'completadas',docsTitle:'Tus documentos',
    docsSub:'Del Dr. Reyes \u00b7 traducidos para ti',
    docDischarge:'Resumen del alta',docDischargeSub:'15 nov \u00b7 6 secciones',
    docMedRec:'Reconciliaci\u00f3n de medicamentos',docMedRecSub:'15 nov \u00b7 Lisinopril 10 mg',
    docLabs:'Resultados de laboratorio',docLabsSub:'14 nov \u00b7 Panel metab\u00f3lico',
    translateBadge:'Traducci\u00f3n con contexto',
    modalCultural:'Contexto cultural',modalWhy:'Por qu\u00e9 importa',modalClose:'Entendido',
    callTitle:'Asistente de cuidado',callStatus:'En espa\u00f1ol \u00b7 D\u00eda 3',
    callLabel:'En vivo',callHedge:'4 palabras de duda',
    callPause:'Pausa de 3.2 s',callLogged:'Enviado al Dr. Reyes',
    line1:'Hola Sra. Garc\u00eda, \u00bfc\u00f3mo se siente con el nuevo medicamento?',
    line2:'S\u00ed, s\u00ed, estoy bien, creo...',
    line3:'Me alegra. \u00bfHa tomado la pastilla rosa todas las ma\u00f1anas?',
    line4:'S\u00ed, todos los d\u00edas. Pero a veces me da un poco de... como mareo.',
    line5:'Gracias por decirme. Voy a avisar al equipo del Dr. Reyes.',
    planTitle:'Tu plan de cuidado',planSub:'D\u00eda 3 de 14',
    medications:'Medicamentos',symptoms:'S\u00edntomas a vigilar',
    pill1Name:'Lisinopril 10 mg',pill1Class:'Inhibidor ACE \u00b7 Presi\u00f3n arterial',
    pill1Time:'8:00 a.m.',pill1Instr:'Una tableta rosa con el desayuno',
    howItWorks:'C\u00f3mo funciona',
    howItWorksBody:'Relaja tus vasos sangu\u00edneos para que la sangre fluya m\u00e1s f\u00e1cil.',
    walkTitle:'Caminata ligera',walkTime:'10:30 a.m.',walkInstr:'20 minutos, ritmo c\u00f3modo',
    bpTitle:'Medir presi\u00f3n arterial',bpTime:'1:00 p.m.',bpInstr:'Sentada, despu\u00e9s del almuerzo',
    dizzinessCard:'Mareo leve',dizzinessSub:'Toca si lo sientes',
    redFlagCard:'Dolor de pecho',redFlagSub:'Llama al 911',
    swellingCard:'Hinchaz\u00f3n facial',swellingSub:'Ve a emergencias',
    navHome:'Inicio',navDocs:'Docs',navCall:'Llamar',navPlan:'Plan',langChip:'ES',
    flagTitle:'Tu equipo de cuidado fue notificado',
    flagBody:'Reportaste mareos leves. Dr. Reyes revisar\u00e1 esto y te llamar\u00e1 en menos de 2 horas.',
    flagAction:'Entendido',flagEmergency:'Llama al 911 si empeora'
  },
  en: {
    greeting:'Good morning',name:'Isa',subtitle:'Let\u2019s see how you\u2019re feeling today.',
    careDay:'Day 3 of 14 \u00b7 Dr. Reyes',upcoming:'Next check-in',
    upcomingTime:'Today \u00b7 6:00 PM',startCall:'Start check-in',
    callSub:'Day 3 review, in your language',quick:'Quick actions',
    reportSymptom:'Report symptom',openDocs:'My documents',
    newMessage:'Message from Dr. Reyes',msgPreview:'Thanks for yesterday\u2019s readings. Everything looks good.',
    ago:'1h ago',missionTag:'Translated with cultural context',
    todayTasks:'Today',done:'done',docsTitle:'Your documents',
    docsSub:'From Dr. Reyes \u00b7 translated for you',
    docDischarge:'Discharge summary',docDischargeSub:'Nov 15 \u00b7 6 sections',
    docMedRec:'Medication reconciliation',docMedRecSub:'Nov 15 \u00b7 Lisinopril 10 mg',
    docLabs:'Lab results',docLabsSub:'Nov 14 \u00b7 Basic metabolic panel',
    translateBadge:'Contextual translation',
    modalCultural:'Cultural context',modalWhy:'Why it matters',modalClose:'Got it',
    callTitle:'Care assistant',callStatus:'In Spanish \u00b7 Day 3',
    callLabel:'Live',callHedge:'4 hedge words',
    callPause:'3.2 s pause',callLogged:'Sent to Dr. Reyes',
    line1:'Hello Mrs. Garc\u00eda, how are you feeling with the new medication?',
    line2:'Yes, yes, I\u2019m fine, I think...',
    line3:'Glad to hear. Have you taken the pink pill every morning?',
    line4:'Yes, every day. But sometimes I feel a little... like dizzy.',
    line5:'Thank you for telling me. I\u2019ll let Dr. Reyes\u2019 team know.',
    planTitle:'Your care plan',planSub:'Day 3 of 14',
    medications:'Medications',symptoms:'Watch for',
    pill1Name:'Lisinopril 10 mg',pill1Class:'ACE inhibitor \u00b7 Blood pressure',
    pill1Time:'8:00 AM',pill1Instr:'One pink tablet with breakfast',
    howItWorks:'How it works',
    howItWorksBody:'Relaxes your blood vessels so blood flows more easily.',
    walkTitle:'Light walk',walkTime:'10:30 AM',walkInstr:'20 minutes, easy pace',
    bpTitle:'Blood pressure',bpTime:'1:00 PM',bpInstr:'Seated, after lunch',
    dizzinessCard:'Mild dizziness',dizzinessSub:'Tap to report',
    redFlagCard:'Chest pain',redFlagSub:'Call 911',
    swellingCard:'Face swelling',swellingSub:'Go to ER',
    navHome:'Home',navDocs:'Docs',navCall:'Call',navPlan:'Plan',langChip:'EN',
    flagTitle:'Your care team has been notified',
    flagBody:'You reported mild dizziness. Dr. Reyes will review and call you within 2 hours.',
    flagAction:'Got it',flagEmergency:'Call 911 if it gets worse'
  }
};

export default function CareCompanion() {
  // Session state
  const [sessionToken, setSessionToken] = useState<string | null>(getSavedToken());
  const [patientId, setPatientId] = useState<number | null>(getSavedPatientId());
  const [sessionReady, setSessionReady] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [showSwitcher, setShowSwitcher] = useState(false);

  // App state (persisted to backend)
  const [screen, setScreen] = useState('home');
  const [lang, setLang] = useState('es');
  const [tasks, setTasks] = useState({ pill: false, walk: false, bp: false });
  const [flag, setFlag] = useState(false);
  const [callStep, setCallStep] = useState(0);
  const [docView, setDocView] = useState('list');
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const saveTimeout = useRef<any>(null);

  // On mount: try to resume session from localStorage
  useEffect(() => {
    const token = getSavedToken();
    if (token) {
      api.resumeSession(token).then(data => {
        setPatientId(data.session.patient_id);
        setHomeData(data);
        if (data.patient?.language) setLang(data.patient.language);
        // Restore saved app state
        if (data.app_state) {
          if (data.app_state.tasks) setTasks(data.app_state.tasks);
          if (data.app_state.lang) setLang(data.app_state.lang);
          if (data.app_state.screen) setScreen(data.app_state.screen);
        }
        setSessionReady(true);
      }).catch(() => {
        // Token expired or invalid — clear and show picker
        clearSession();
        setSessionToken(null);
        setPatientId(null);
        setSessionReady(true);
      });
    } else {
      setSessionReady(true);
    }
  }, []);

  // Load patient list for picker/switcher
  useEffect(() => {
    api.listPatients().then(setPatients).catch(() => {});
  }, []);

  // Start a new session when patient is selected
  const selectPatient = async (pid: number) => {
    try {
      const res = await api.startSession(pid);
      saveSession(res.token, pid);
      setSessionToken(res.token);
      setPatientId(pid);
      // Reset app state for new patient
      setTasks({ pill: false, walk: false, bp: false });
      setScreen('home');
      setShowSwitcher(false);
      // Load patient data
      const data = await api.resumeSession(res.token);
      setHomeData(data);
      if (data.patient?.language) setLang(data.patient.language);
    } catch (e) { console.error(e); }
  };

  // Save state to backend (debounced)
  const persistState = (newTasks?: any, newLang?: string, newScreen?: string) => {
    const token = getSavedToken();
    if (!token) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      api.saveState(token, {
        tasks: newTasks || tasks,
        lang: newLang || lang,
        screen: newScreen || screen,
      }).catch(() => {});
    }, 500);
  };

  // WebSocket
  useEffect(() => {
    if (!patientId) return;
    wsRef.current = connectPatientWS(patientId, () => {});
    return () => { wsRef.current?.close(); };
  }, [patientId]);

  // Call auto-step
  useEffect(() => {
    if (screen === 'call') {
      setCallStep(0);
      const id = setInterval(() => setCallStep(s => s < 5 ? s + 1 : s), 1400);
      return () => clearInterval(id);
    }
  }, [screen]);

  const t = T[lang];
  const doneCount = Object.values(tasks).filter(Boolean).length;
  const totalCount = Object.keys(tasks).length;

  // Show loading while resuming session
  if (!sessionReady) {
    return (
      <div style={{ fontFamily: "'Geist',system-ui,sans-serif", background: "#F5EEF2", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#8A7AA3", fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  // No session — show patient picker
  if (!patientId || !sessionToken) {
    return (
      <div style={{ fontFamily: "'Geist',system-ui,sans-serif", background: "#F5EEF2", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div style={{ background: "#FCF8F9", border: "1px solid #E5DAE8", borderRadius: 24, padding: 32, maxWidth: 400, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 300, fontFamily: "'Fraunces',serif", color: "#2D1F3D", marginBottom: 8 }}>Care Companion</div>
          <div style={{ fontSize: 13, color: "#5B4A6E", marginBottom: 24 }}>Select a patient to continue</div>
          {patients.length === 0 ? (
            <div style={{ color: "#8A7AA3", fontSize: 13, padding: 20 }}>No patients enrolled yet. Use the provider dashboard to enroll a patient first.</div>
          ) : patients.map((p: any) => (
            <button key={p.id} onClick={() => selectPatient(p.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", background: "#F5EEF2", border: "1px solid #E5DAE8", borderRadius: 14, cursor: "pointer", marginBottom: 8, textAlign: "left", fontFamily: "inherit" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#8B7BB8,#476544)", color: "#F3E8D1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                {p.first_name[0]}{p.last_name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#2D1F3D" }}>{p.first_name} {p.last_name}</div>
                <div style={{ fontSize: 11, color: "#8A7AA3" }}>{(p.language || "").toUpperCase()} &middot; {p.provider_name || "No provider"}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const patientName = homeData?.patient ? homeData.patient.first_name : t.name;
  const providerName = homeData?.patient?.provider_name || "your doctor";

  const postEvent = (type: string, data?: any) => { api.postEvent(patientId, type, data).catch(() => {}); };
  const toggleTask = (key: string) => {
    const newTasks = { ...tasks, [key]: !(tasks as any)[key] };
    setTasks(newTasks);
    postEvent('task_completed', { task: key, completed: newTasks[key as keyof typeof newTasks] });
    persistState(newTasks);
  };

  const switchLang = () => {
    const newLang = lang === 'es' ? 'en' : 'es';
    setLang(newLang);
    persistState(undefined, newLang);
  };

  const switchScreen = (s: string) => {
    setScreen(s);
    persistState(undefined, undefined, s);
  };
  const handleFlag = () => { setFlag(true); postEvent('flag_triggered', { symptom: 'dizziness' }); };
  const handleCallStart = () => { switchScreen('call'); postEvent('call_started', { day: 3 }); };
  const handleCallEnd = () => { switchScreen('home'); postEvent('call_ended', { steps: callStep }); };

  const currentNote = activeNote ? NOTES[activeNote]?.[lang] : null;

  return (
    <div>
      <style>{CSS}</style>
      <div className="phoneWrap">
        <div className="phone">
          <div className="notch" />
          <div className="phoneScreen">
            <div className="statusBar">
              <span>9:41</span>
              <div className="statusBarIcons">
                <button onClick={() => setShowSwitcher(!showSwitcher)} style={{
                  background: "none", border: "none", cursor: "pointer", padding: "2px 6px",
                  borderRadius: 8, fontSize: 10, fontWeight: 700, color: "var(--ink-2)",
                  fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3,
                }}>
                  {patientName} &#9662;
                </button>
                <Signal size={13}/><Wifi size={13}/><Battery size={16}/>
              </div>
            </div>

            {/* Patient switcher dropdown */}
            {showSwitcher && (
              <div style={{
                position: "absolute", top: 52, right: 20, zIndex: 50,
                background: "var(--surface)", border: "1px solid var(--line)",
                borderRadius: 16, padding: 8, minWidth: 200,
                boxShadow: "0 8px 24px rgba(45,31,61,0.2)",
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "6px 10px" }}>Switch patient</div>
                {patients.map((p: any) => (
                  <button key={p.id} onClick={() => selectPatient(p.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px", background: p.id === patientId ? "var(--surface-2)" : "transparent",
                    border: "none", borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "linear-gradient(135deg,#8B7BB8,#476544)", color: "#F3E8D1",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 10,
                    }}>{p.first_name[0]}{p.last_name[0]}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{p.first_name} {p.last_name}</div>
                      <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{(p.language || "").toUpperCase()}</div>
                    </div>
                    {p.id === patientId && <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--sage)" }}>&#10003;</span>}
                  </button>
                ))}
              </div>
            )}

            {screen === 'home' && (
              <div className="screenBody">
                <div className="topHeader">
                  <div>
                    <div className="dayChip">{t.careDay}</div>
                    <div className="greet">{t.greeting}, <b>{patientName}</b></div>
                    <div className="subtitle">{t.subtitle}</div>
                  </div>
                  <button className="langSwitch" onClick={() => switchLang()}><Globe size={11}/> {t.langChip}</button>
                </div>
                <div className="heroCard">
                  <div className="heroLabel"><div className="pulseDot"/> {t.upcoming}</div>
                  <div className="heroTitle">{t.upcomingTime}</div>
                  <div className="heroSub">{t.callSub}</div>
                  <button className="heroBtn" onClick={handleCallStart}>{t.startCall} <ArrowRight size={14}/></button>
                </div>
                <div className="progressRow">
                  <div className="progressCard accent"><div className="progressNum">{doneCount}<span>/{totalCount}</span></div><div className="progressLabel">{t.todayTasks} &middot; {t.done}</div></div>
                  <div className="progressCard"><div className="progressNum" style={{fontSize:22,marginTop:6}}>6:00 PM</div><div className="progressLabel">{t.upcoming}</div></div>
                </div>
                <div className="sectionLabel">{t.quick}</div>
                <div className="quickRow">
                  <button className="quickCard docs" onClick={() => { switchScreen('docs'); setDocView('list'); postEvent('doc_viewed', { doc: 'list' }); }}><div className="qIcon"><BookOpen size={15}/></div><div className="qLabel">{t.openDocs}</div><div className="qSub">{t.translateBadge}</div></button>
                  <button className="quickCard" onClick={handleFlag}><div className="qIcon"><Heart size={15}/></div><div className="qLabel">{t.reportSymptom}</div><div className="qSub">AI &middot; 24/7</div></button>
                </div>
                <div className="sectionLabel">{t.newMessage}</div>
                <div className="msgCard"><div className="msgAvatar">R</div><div className="msgText"><div className="msgName">Dr. Reyes <span className="msgTime">{t.ago}</span></div><div className="msgPreview">{t.msgPreview}</div></div></div>
              </div>
            )}

            {screen === 'docs' && (
              <div className="screenBody">
                <div className="topHeader">
                  <div>
                    <div className="dayChip">{t.careDay}</div>
                    <div style={{fontFamily:"'Fraunces',serif",fontWeight:300,fontSize:32,color:'var(--ink)'}}>{t.docsTitle}</div>
                    <div style={{fontSize:12,color:'var(--ink-2)',marginTop:6}}>{t.docsSub}</div>
                  </div>
                  <button className="langSwitch" onClick={() => switchLang()}><Globe size={11}/> {t.langChip}</button>
                </div>
                <div className="sectionLabel">{t.missionTag}</div>
                {[{icon:<FileText size={22}/>,name:t.docDischarge,sub:t.docDischargeSub},{icon:<Pill size={22}/>,name:t.docMedRec,sub:t.docMedRecSub},{icon:<Activity size={22}/>,name:t.docLabs,sub:t.docLabsSub}].map((doc,i) => (
                  <button key={i} onClick={() => postEvent('doc_viewed',{doc:doc.name})} style={{display:'flex',gap:14,padding:18,background:'var(--surface)',border:'1px solid var(--line)',borderRadius:20,alignItems:'center',marginBottom:10,cursor:'pointer',width:'100%',textAlign:'left'}}>
                    <div style={{width:46,height:46,borderRadius:14,background:i===0?'var(--clay-soft)':'var(--clay-softer)',color:'var(--clay)',display:'flex',alignItems:'center',justifyContent:'center'}}>{doc.icon}</div>
                    <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:'var(--ink)'}}>{doc.name}</div><div style={{fontSize:11,color:'var(--ink-3)',marginTop:4,display:'flex',alignItems:'center',gap:6}}><span>{doc.sub}</span><span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 7px',background:'var(--sage-soft)',color:'var(--sage-2)',borderRadius:999,fontSize:9,fontWeight:600}}><Languages size={9}/> ES</span></div></div>
                    <ChevronRight size={18} color="#9A8B78"/>
                  </button>
                ))}
              </div>
            )}

            {screen === 'call' && (
              <div className="callScreen">
                <div className="callHeader">
                  <div className="callLiveChip"><div className="dot"/> {t.callLabel}</div>
                  <div className="callName">{t.callTitle}</div>
                  <div className="callMeta">{t.callStatus}</div>
                </div>
                <div className="waveCircle"><div className="waveRing"/><div className="waveRing"/><div className="waveRing"/><div className="waveCore"><Sparkles size={26}/></div></div>
                <div className="transcript">
                  {[{role:'agent',text:t.line1,label:'AI'},{role:'user',text:t.line2,label:patientName,ann:{type:'pause',text:t.callPause}},{role:'agent',text:t.line3,label:'AI'},{role:'user',text:t.line4,label:patientName,ann:{type:'hedge',text:t.callHedge}},{role:'agent',text:t.line5,label:'AI',ann:{type:'logged',text:t.callLogged}}].slice(0,callStep).map((l:any,i:number) => (
                    <div key={i} className={`bubble ${l.role}`} style={{animationDelay:`${i*0.05}s`}}>
                      <div className="role">{l.label}</div>{l.text}
                      {l.ann && <div className={`annotation ${l.ann.type==='logged'?'logged':''}`}>{l.ann.type==='logged'?<Check size={9}/>:<AlertTriangle size={9}/>}{l.ann.text}</div>}
                    </div>
                  ))}
                </div>
                <div className="callControls"><button className="callCtrl"><MicOff size={18}/></button><button className="callCtrl end" onClick={handleCallEnd}><PhoneOff size={20}/></button><button className="callCtrl"><Volume2 size={18}/></button></div>
              </div>
            )}

            {screen === 'plan' && (
              <div className="screenBody">
                <div className="topHeader"><div><div className="dayChip">{t.planSub}</div><div style={{fontFamily:"'Fraunces',serif",fontWeight:300,fontSize:32,color:'var(--ink)'}}>{t.planTitle}</div></div><button className="langSwitch" onClick={() => switchLang()}><Globe size={11}/> {t.langChip}</button></div>
                <div className="sectionLabel">{t.medications}</div>
                <div className="pillCard">
                  <button className={`pillCheck ${tasks.pill?'checked':''}`} onClick={() => toggleTask('pill')}>{tasks.pill && <Check size={16}/>}</button>
                  <div className="pillCardTop">
                    <div className="pill3d"><div className="pill3dInner"><div className="pill3dBody"/></div></div>
                    <div className="pillInfo"><div className="pillName">{t.pill1Name}</div><div className="pillClass">{t.pill1Class}</div><div className="pillTime"><Clock size={11}/> {t.pill1Time}</div></div>
                  </div>
                  <div className="pillInstr">{t.pill1Instr}</div>
                  <div className="pillMechanism"><div className="pillMechLabel"><Zap size={10}/> {t.howItWorks}</div><div className="pillMechBody">{t.howItWorksBody}</div></div>
                  <div className="pillWarnings"><span className="pillWarnChip"><AlertTriangle size={9}/> {lang==='es'?'Levantarse despacio':'Stand up slowly'}</span><span className="pillWarnChip"><AlertTriangle size={9}/> {lang==='es'?'Sin sal de potasio':'No potassium salt'}</span></div>
                </div>
                <div className="simpleMed walk"><div className="simpleMedIcon"><Footprints size={18}/></div><div className="simpleMedBody"><div className="simpleMedName">{t.walkTitle}</div><div className="simpleMedTime">{t.walkTime}</div><div className="simpleMedInstr">{t.walkInstr}</div></div><button className={`simpleMedCheck ${tasks.walk?'checked':''}`} onClick={() => toggleTask('walk')}>{tasks.walk && <Check size={14}/>}</button></div>
                <div className="simpleMed bp"><div className="simpleMedIcon"><Activity size={18}/></div><div className="simpleMedBody"><div className="simpleMedName">{t.bpTitle}</div><div className="simpleMedTime">{t.bpTime}</div><div className="simpleMedInstr">{t.bpInstr}</div></div><button className={`simpleMedCheck ${tasks.bp?'checked':''}`} onClick={() => toggleTask('bp')}>{tasks.bp && <Check size={14}/>}</button></div>
                <div className="sectionLabel">{t.symptoms}</div>
                <div className="watchRow">
                  <button className="watchCard amber" onClick={handleFlag}><div className="watchIcon"><AlertTriangle size={12}/></div><div className="watchTitle">{t.dizzinessCard}</div><div className="watchSub">{t.dizzinessSub}</div></button>
                  <div className="watchCard alert"><div className="watchIcon"><PhoneIcon size={12}/></div><div className="watchTitle">{t.redFlagCard}</div><div className="watchSub">{t.redFlagSub}</div></div>
                  <div className="watchCard serious"><div className="watchIcon"><AlertTriangle size={12}/></div><div className="watchTitle">{t.swellingCard}</div><div className="watchSub">{t.swellingSub}</div></div>
                </div>
              </div>
            )}

            {flag && <div className="flagModal" onClick={() => setFlag(false)}><div className="flagCard" onClick={e => e.stopPropagation()}><div className="flagHead"><div className="flagIcon"><AlertTriangle size={18}/></div><div className="flagKind">Care team</div></div><div className="flagTitle">{t.flagTitle}</div><div className="flagBody">{t.flagBody}</div><div className="flagEmergency"><PhoneIcon size={12}/> {t.flagEmergency}</div><button className="flagBtn" onClick={() => setFlag(false)}>{t.flagAction}</button></div></div>}
            {currentNote && <div className="noteOverlay" onClick={() => setActiveNote(null)}><div className="noteSheet" onClick={e => e.stopPropagation()}><div className="noteHandle"/><div className="noteKind"><Languages size={11}/> {t.translateBadge}</div><div className="notePhrase">{currentNote.original}</div><div className="notePhraseSub">{currentNote.literal}</div><div className="noteBlock cultural"><div className="noteBlockLabel"><BookOpen size={10}/> {t.modalCultural}</div><div className="noteBlockBody">{currentNote.cultural}</div></div><div className="noteBlock why"><div className="noteBlockLabel"><Lightbulb size={10}/> {t.modalWhy}</div><div className="noteBlockBody">{currentNote.why}</div></div><button className="noteClose" onClick={() => setActiveNote(null)}>{t.modalClose}</button></div></div>}

            <div className="navWrap"><div className="nav">
              <button className={`navBtn ${screen==='home'?'active':''}`} onClick={() => switchScreen('home')}><HomeIcon size={16}/><div className="lbl">{t.navHome}</div></button>
              <button className={`navBtn ${screen==='docs'?'active':''}`} onClick={() => {switchScreen('docs');setDocView('list');}}><FileText size={16}/><div className="lbl">{t.navDocs}</div></button>
              <button className={`navBtn ${screen==='call'?'active':''}`} onClick={handleCallStart}><PhoneIcon size={16}/><div className="lbl">{t.navCall}</div></button>
              <button className={`navBtn ${screen==='plan'?'active':''}`} onClick={() => switchScreen('plan')}><Pill size={16}/><div className="lbl">{t.navPlan}</div></button>
            </div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400&family=Geist:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;-webkit-font-smoothing:antialiased;margin:0;padding:0}
:root{--bg:#F5EEF2;--bg-2:#EDE4ED;--surface:#FCF8F9;--surface-2:#F3EAEE;--ink:#2D1F3D;--ink-2:#5B4A6E;--ink-3:#8A7AA3;--ink-4:#BCB0D0;--line:#E5DAE8;--line-2:#D0C2DA;--clay:#E8704C;--clay-2:#C85530;--clay-3:#A03D1C;--clay-soft:#FCE4D6;--clay-softer:#FFF0E6;--sage:#8B7BB8;--sage-2:#6B5B98;--sage-soft:#E8E0F2;--coral:#E06B58;--coral-soft:#FBDDD4;--gold:#F5A582;--gold-2:#C47556;--gold-soft:#FCE8D9;--ink-paper:#FEF8F4;--bezel:#1F1527}
body{font-family:'Geist',system-ui,sans-serif;background:var(--bg)}
.phoneWrap{display:flex;justify-content:center;padding:40px 0}
.phone{width:392px;height:810px;background:linear-gradient(145deg,#2A1E32 0%,#14091C 100%);border-radius:54px;padding:13px;position:relative;box-shadow:0 2px 4px rgba(45,31,61,0.1),0 30px 70px -20px rgba(45,31,61,0.45),0 70px 140px -50px rgba(45,31,61,0.5)}
.phoneScreen{width:100%;height:100%;background:var(--bg);border-radius:42px;overflow:hidden;display:flex;flex-direction:column}
.notch{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:112px;height:32px;background:#000;border-radius:20px;z-index:30}
.statusBar{padding:18px 30px 4px;display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600;color:var(--ink);position:relative;z-index:5;height:50px;flex-shrink:0}
.statusBarIcons{display:flex;gap:6px;align-items:center}
.screenBody{flex:1;overflow-y:auto;overflow-x:hidden;padding:0 24px 110px;scrollbar-width:none;animation:fadeScreen .4s cubic-bezier(.2,.8,.2,1)}
.screenBody::-webkit-scrollbar{display:none}
@keyframes fadeScreen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.topHeader{display:flex;justify-content:space-between;align-items:flex-start;padding-top:10px;margin-bottom:22px}
.dayChip{font-size:10px;color:var(--ink-3);letter-spacing:.15em;text-transform:uppercase;margin-bottom:6px;font-weight:600}
.greet{font-family:'Fraunces',serif;font-weight:300;font-size:34px;line-height:1.02;color:var(--ink);letter-spacing:-.02em}
.greet b{font-style:italic;font-weight:400}
.subtitle{font-size:13px;color:var(--ink-2);margin-top:6px;line-height:1.5;max-width:240px}
.langSwitch{padding:7px 11px;background:var(--surface);border:1px solid var(--line);border-radius:999px;font-size:10px;font-weight:600;color:var(--ink);letter-spacing:.1em;display:flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0}
.heroCard{background:linear-gradient(165deg,#FFB584 0%,#F48269 22%,#E06B6B 42%,#B879A8 68%,#8B7BB8 100%);border-radius:28px;padding:24px;color:#FFF;position:relative;overflow:hidden;margin-bottom:18px}
.heroLabel{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,0.85);display:flex;align-items:center;gap:8px;margin-bottom:16px;font-weight:600}
.pulseDot{width:7px;height:7px;border-radius:50%;background:#FFF;animation:pulse 1.8s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.3)}}
.heroTitle{font-family:'Fraunces',serif;font-weight:300;font-size:28px;line-height:1.15;margin-bottom:6px}
.heroSub{font-size:12px;color:rgba(255,255,255,0.82);margin-bottom:22px;line-height:1.5}
.heroBtn{background:#FFF;color:var(--clay-2);border:none;padding:13px 20px;border-radius:999px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.sectionLabel{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);font-weight:600;margin:22px 0 12px}
.progressRow{display:flex;gap:12px;margin-bottom:4px}
.progressCard{flex:1;background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:18px;position:relative;overflow:hidden}
.progressCard.accent{background:linear-gradient(145deg,var(--clay-soft) 0%,#F4DCCD 100%);border-color:#E4C2AF}
.progressNum{font-family:'Fraunces',serif;font-weight:300;font-size:42px;line-height:1;color:var(--ink)}
.progressNum span{font-size:20px;color:var(--ink-3);margin-left:2px}
.progressLabel{font-size:11px;color:var(--ink-2);margin-top:10px;line-height:1.4}
.quickRow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.quickCard{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:15px 14px;cursor:pointer;text-align:left;transition:all .2s}
.quickCard:hover{border-color:var(--clay);transform:translateY(-1px)}
.quickCard .qIcon{width:34px;height:34px;border-radius:11px;background:var(--clay-soft);color:var(--clay);display:flex;align-items:center;justify-content:center;margin-bottom:10px}
.quickCard.docs .qIcon{background:var(--sage-soft);color:var(--sage)}
.quickCard .qLabel{font-size:12px;color:var(--ink);font-weight:500;line-height:1.3}
.quickCard .qSub{font-size:10px;color:var(--ink-3);margin-top:2px}
.msgCard{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:16px 18px;display:flex;gap:14px;align-items:flex-start}
.msgAvatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--sage) 0%,#476544 100%);color:#F3E8D1;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:16px;flex-shrink:0}
.msgText{flex:1;min-width:0}
.msgName{font-size:12px;font-weight:600;color:var(--ink);display:flex;justify-content:space-between;margin-bottom:3px}
.msgTime{font-size:10px;color:var(--ink-3);font-weight:400}
.msgPreview{font-size:12px;color:var(--ink-2);line-height:1.45}
.navWrap{position:absolute;bottom:0;left:0;right:0;padding:10px 14px 18px;background:linear-gradient(180deg,rgba(239,231,216,0) 0%,var(--bg) 35%);z-index:40}
.nav{display:flex;background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:8px 6px;gap:2px;box-shadow:0 14px 36px -14px rgba(35,28,23,0.25)}
.navBtn{flex:1;background:none;border:none;padding:9px 4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;border-radius:16px;color:var(--ink-3);transition:all .25s}
.navBtn.active{background:var(--bezel);color:#F3E8D1}
.navBtn .lbl{font-size:9px;font-weight:500}
.callScreen{padding:0 24px 100px;flex:1;display:flex;flex-direction:column;overflow-y:auto;scrollbar-width:none;animation:fadeScreen .4s}
.callScreen::-webkit-scrollbar{display:none}
.callHeader{padding-top:10px;margin-bottom:14px}
.callLiveChip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:var(--clay-soft);color:var(--clay);border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
.callLiveChip .dot{width:6px;height:6px;border-radius:50%;background:var(--clay);animation:pulse 1.6s infinite}
.callName{font-family:'Fraunces',serif;font-weight:300;font-size:28px;letter-spacing:-.015em;color:var(--ink)}
.callMeta{font-size:12px;color:var(--ink-2);margin-top:4px}
.waveCircle{position:relative;width:160px;height:160px;margin:14px auto 10px;display:flex;align-items:center;justify-content:center}
.waveRing{position:absolute;inset:0;border-radius:50%;border:1px solid var(--clay);opacity:0;animation:waveGrow 3s infinite}
.waveRing:nth-child(2){animation-delay:1s}
.waveRing:nth-child(3){animation-delay:2s}
@keyframes waveGrow{0%{transform:scale(.4);opacity:.6}100%{transform:scale(1.15);opacity:0}}
.waveCore{width:96px;height:96px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#D06B48 0%,var(--clay) 50%,var(--clay-2) 100%);display:flex;align-items:center;justify-content:center;color:#F3E8D1;animation:breathe 2.4s ease-in-out infinite}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
.transcript{display:flex;flex-direction:column;gap:10px;margin-top:4px}
.bubble{max-width:88%;padding:12px 14px;border-radius:18px;font-size:12px;line-height:1.5;opacity:0;transform:translateY(8px);animation:fadeUp .5s forwards}
@keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
.bubble.agent{background:#1A130D;color:#F3E8D1;align-self:flex-start;border-bottom-left-radius:6px}
.bubble.user{background:var(--surface);border:1px solid var(--line);color:var(--ink);align-self:flex-end;border-bottom-right-radius:6px}
.bubble .role{font-size:9px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:4px;opacity:.55;font-weight:600}
.annotation{margin-top:8px;display:inline-flex;align-items:center;gap:5px;padding:3px 8px;background:var(--gold-soft);color:var(--gold-2);border-radius:999px;font-size:9px;font-weight:600}
.annotation.logged{background:var(--sage-soft);color:var(--sage-2)}
.callControls{position:absolute;bottom:100px;left:0;right:0;display:flex;justify-content:center;gap:22px;padding:0 24px}
.callCtrl{width:54px;height:54px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);display:flex;align-items:center;justify-content:center;cursor:pointer}
.callCtrl.end{background:var(--clay);border-color:var(--clay);color:#F3E8D1;width:62px;height:62px}
.pillCard{background:var(--surface);border:1px solid var(--line);border-radius:26px;padding:20px;position:relative;overflow:hidden;margin-bottom:14px;box-shadow:0 4px 16px -6px rgba(35,28,23,0.08)}
.pillCardTop{display:flex;gap:16px;align-items:flex-start;margin-bottom:14px}
.pill3d{width:88px;height:88px;position:relative;flex-shrink:0;perspective:500px;display:flex;align-items:center;justify-content:center}
.pill3dInner{width:78px;height:48px;position:relative;transform-style:preserve-3d;animation:pillRotate 8s ease-in-out infinite}
@keyframes pillRotate{0%,100%{transform:rotateY(-20deg) rotateX(10deg)}50%{transform:rotateY(20deg) rotateX(-5deg)}}
.pill3dBody{position:absolute;inset:0;border-radius:40px;background:radial-gradient(ellipse at 30% 25%,#FFCAAE 0%,#F48269 35%,#C85530 100%);box-shadow:inset 0 -8px 14px rgba(80,20,10,0.35),inset 0 8px 14px rgba(255,255,255,0.35),0 8px 20px -4px rgba(200,85,48,0.4)}
.pillInfo{flex:1;min-width:0}
.pillName{font-family:'Fraunces',serif;font-weight:400;font-size:20px;color:var(--ink)}
.pillClass{font-size:11px;color:var(--ink-3);margin-top:3px}
.pillTime{display:inline-flex;align-items:center;gap:5px;margin-top:10px;padding:4px 10px;background:var(--surface-2);border-radius:999px;font-size:11px;font-weight:500;color:var(--ink-2)}
.pillInstr{font-size:12px;color:var(--ink-2);line-height:1.5;margin:4px 0 12px}
.pillMechanism{padding:12px 14px;background:var(--surface-2);border-radius:14px;margin-bottom:12px}
.pillMechLabel{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.pillMechBody{font-size:11px;color:var(--ink-2);line-height:1.5;flex:1}
.pillWarnings{display:flex;flex-wrap:wrap;gap:6px}
.pillWarnChip{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;background:var(--gold-soft);color:var(--gold-2);border-radius:999px;font-size:9px;font-weight:600}
.pillCheck{width:30px;height:30px;border-radius:10px;border:1.5px solid var(--line-2);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;position:absolute;top:20px;right:20px}
.pillCheck.checked{background:var(--sage);border-color:var(--sage);color:#F3E8D1}
.simpleMed{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:16px;margin-bottom:10px;display:flex;gap:14px;align-items:center;position:relative}
.simpleMed::before{content:'';position:absolute;left:0;top:18px;bottom:18px;width:3px;border-radius:0 3px 3px 0}
.simpleMed.walk::before{background:var(--sage)}
.simpleMed.bp::before{background:var(--gold)}
.simpleMedIcon{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.simpleMed.walk .simpleMedIcon{background:var(--sage-soft);color:var(--sage)}
.simpleMed.bp .simpleMedIcon{background:var(--gold-soft);color:var(--gold-2)}
.simpleMedBody{flex:1;min-width:0}
.simpleMedName{font-size:14px;font-weight:600;color:var(--ink)}
.simpleMedTime{font-size:11px;color:var(--ink-3);font-weight:500}
.simpleMedInstr{font-size:12px;color:var(--ink-2);line-height:1.4;margin-top:2px}
.simpleMedCheck{width:28px;height:28px;border-radius:9px;border:1.5px solid var(--line-2);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.simpleMedCheck.checked{background:var(--sage);border-color:var(--sage);color:#F3E8D1}
.watchRow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.watchCard{padding:12px 10px;border-radius:14px;border:1px solid;cursor:pointer;text-align:left;min-height:100px;display:flex;flex-direction:column}
.watchCard.amber{background:var(--gold-soft);border-color:#E6D5A7}
.watchCard.alert{background:var(--coral-soft);border-color:#E9C4BA}
.watchCard.serious{background:#E8C4BA;border-color:#D89E8E}
.watchIcon{width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
.watchCard.amber .watchIcon{background:#E6D5A7;color:var(--gold-2)}
.watchCard.alert .watchIcon{background:#E9C4BA;color:var(--clay-2)}
.watchCard.serious .watchIcon{background:#D89E8E;color:var(--clay-3)}
.watchTitle{font-size:11px;font-weight:600;color:var(--ink);line-height:1.2}
.watchSub{font-size:9px;color:var(--ink-2);margin-top:3px;line-height:1.3}
.flagModal{position:absolute;inset:0;background:rgba(20,16,12,0.55);backdrop-filter:blur(6px);z-index:50;display:flex;align-items:flex-end;justify-content:center;padding:22px;border-radius:42px;animation:fadeIn .3s}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.flagCard{background:var(--surface);border-radius:26px;padding:24px 22px 22px;width:100%;margin-bottom:94px;animation:slideUp .4s cubic-bezier(.2,.8,.2,1);border:1px solid var(--line);position:relative;overflow:hidden}
.flagCard::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--coral)}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.flagHead{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.flagIcon{width:38px;height:38px;border-radius:12px;background:var(--coral-soft);color:var(--coral);display:flex;align-items:center;justify-content:center}
.flagKind{font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--coral);font-weight:700}
.flagTitle{font-family:'Fraunces',serif;font-weight:300;font-size:22px;line-height:1.2;color:var(--ink);margin-bottom:10px}
.flagBody{font-size:13px;color:var(--ink-2);line-height:1.55;margin-bottom:18px}
.flagEmergency{background:var(--coral-soft);border:1px solid #E9C4BA;border-radius:12px;padding:10px 12px;font-size:11px;color:var(--coral);display:flex;align-items:center;gap:8px;margin-bottom:16px;font-weight:500}
.flagBtn{width:100%;background:var(--bezel);color:#F3E8D1;border:none;padding:14px;border-radius:14px;font-size:13px;font-weight:600;cursor:pointer}
.noteOverlay{position:absolute;inset:0;background:rgba(20,16,12,0.55);backdrop-filter:blur(6px);z-index:60;display:flex;align-items:flex-end;border-radius:42px;animation:fadeIn .3s}
.noteSheet{width:100%;background:var(--surface);border-radius:28px 28px 42px 42px;padding:20px 22px 28px;max-height:84%;overflow-y:auto;scrollbar-width:none;animation:slideUp .45s cubic-bezier(.2,.8,.2,1);border-top:1px solid var(--line)}
.noteSheet::-webkit-scrollbar{display:none}
.noteHandle{width:40px;height:4px;background:var(--ink-4);border-radius:2px;margin:0 auto 18px}
.noteKind{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--clay);font-weight:700;display:flex;align-items:center;gap:6px;margin-bottom:8px}
.notePhrase{font-family:'Fraunces',serif;font-weight:300;font-size:24px;line-height:1.2;color:var(--ink);margin-bottom:4px}
.notePhraseSub{font-family:'Fraunces',serif;font-style:italic;font-size:13px;color:var(--ink-3);margin-bottom:20px}
.noteBlock{padding:14px;border-radius:14px;margin-bottom:10px;border:1px solid var(--line)}
.noteBlock.cultural{background:var(--surface-2);border-color:var(--line-2)}
.noteBlock.why{background:var(--clay-softer);border-color:#E4C2AF}
.noteBlockLabel{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:6px}
.noteBlock.why .noteBlockLabel{color:var(--clay)}
.noteBlockBody{font-size:12px;color:var(--ink);line-height:1.6}
.noteClose{width:100%;background:var(--ink);color:#F3E8D1;border:none;padding:14px;border-radius:14px;font-size:13px;font-weight:600;cursor:pointer;margin-top:14px}
`;
