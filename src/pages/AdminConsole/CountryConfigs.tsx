import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CountryConfig } from '../../types/country';
import { Save, Upload, Download, Globe, CheckCircle2, AlertTriangle } from 'lucide-react';

const TextInput = ({label, value, onChange, placeholder}:{label:string; value?:string; onChange:(v:string)=>void; placeholder?:string}) => (
  <label className="block mb-3">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <input className="mt-1 w-full rounded-xl border p-2 focus:outline-none focus:ring focus:ring-indigo-200"
      value={value || ''} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} />
  </label>
);

export default function CountryConfigs() {
  const [countryCode, setCountryCode] = useState<string>('default');
  const [data, setData] = useState<CountryConfig>({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<null | 'ok' | 'err'>(null);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'countryConfigs', countryCode));
        setData((snap.exists() ? snap.data() : {}) as CountryConfig);
      } finally {
        setLoading(false);
      }
    })();
  }, [countryCode]);

  const completeness = useMemo(()=>{
    let score = 0, total = 7;
    if (data.llm) score++;
    if (data.emergency && data.emergency.length) score++;
    if (data.authorities && data.authorities.length) score++;
    if (data.embassiesConsulates && data.embassiesConsulates.length) score++;
    if (data.associations && data.associations.length) score++;
    if (data.procedures && data.procedures.length) score++;
    if (data.templates && (data.templates.firstReply || data.templates.whatsappTemplate)) score++;
    return Math.round(100 * score / total);
  }, [data]);

  const onImport = async (file: File) => {
    const text = await file.text();
    const json = JSON.parse(text);
    setData(json);
  };
  const onExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `country-${countryCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const onSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'countryConfigs', countryCode), {
        ...data,
        meta: {
          ...(data.meta || {}),
          lastUpdatedAt: new Date().toISOString()
        }
      }, { merge: true });
      setSaved('ok');
      setTimeout(()=>setSaved(null), 2000);
    } catch {
      setSaved('err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Globe/> Paramètres par pays</h1>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          Complétude: 
          <span className={`px-2 py-1 rounded-xl ${completeness>70?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{completeness}%</span>
          {saved==='ok' && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={16}/> Enregistré</span>}
          {saved==='err' && <span className="flex items-center gap-1 text-red-600"><AlertTriangle size={16}/> Échec</span>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <TextInput label="Code pays (ISO, ex: FR)" value={countryCode} onChange={setCountryCode} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Import JSON</label>
          <input type="file" accept="application/json" onChange={(e)=>e.target.files && onImport(e.target.files[0])} />
        </div>
        <div className="flex gap-2">
          <button onClick={onExport} className="px-4 py-2 rounded-xl border flex items-center gap-2"><Download size={16}/> Exporter</button>
          <button onClick={onSave} disabled={loading} className="px-4 py-2 rounded-xl bg-indigo-600 text-white flex items-center gap-2"><Save size={16}/> Sauvegarder</button>
        </div>
      </div>

      {/* LLM section */}
      <section className="p-4 rounded-2xl border space-y-4 bg-white shadow-sm">
        <h2 className="font-semibold">Paramètres LLM</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput label="Ton" value={data.llm?.tone} onChange={v=>setData({...data, llm: {...(data.llm||{}), tone:v}})} />
          <TextInput label="Style de rédaction" value={data.llm?.styleGuide} onChange={v=>setData({...data, llm: {...(data.llm||{}), styleGuide:v}})} />
          <TextInput label="Modèle" value={data.llm?.model || 'gpt-5'} onChange={v=>setData({...data, llm: {...(data.llm||{}), model:v}})} />
          <TextInput label="Température" value={String(data.llm?.temperature ?? '')} onChange={v=>setData({...data, llm: {...(data.llm||{}), temperature: Number(v)}})} />
        </div>
      </section>

      {/* Directories minimal editors */}
      <section className="p-4 rounded-2xl border space-y-2 bg-white shadow-sm">
        <h2 className="font-semibold">Urgences</h2>
        <small className="text-gray-500">Nom / Numéro / Disponibilité</small>
        <DynamicList items={data.emergency || []} onChange={(items)=>setData({...data, emergency: items})} fields={['name','phone','availability']}/>
      </section>

      <section className="p-4 rounded-2xl border space-y-2 bg-white shadow-sm">
        <h2 className="font-semibold">Autorités</h2>
        <DynamicList items={data.authorities || []} onChange={(items)=>setData({...data, authorities: items})} fields={['name','role','phone','address','website']}/>
      </section>

      <section className="p-4 rounded-2xl border space-y-2 bg-white shadow-sm">
        <h2 className="font-semibold">Associations</h2>
        <DynamicList items={data.associations || []} onChange={(items)=>setData({...data, associations: items})} fields={['name','scope','phone','website']}/>
      </section>

      <section className="p-4 rounded-2xl border space-y-2 bg-white shadow-sm">
        <h2 className="font-semibold">Procédures</h2>
        <DynamicList items={data.procedures || []} onChange={(items)=>setData({...data, procedures: items})} fields={['topic','steps','docsRequired','links']}/>
      </section>

      <section className="p-4 rounded-2xl border space-y-2 bg-white shadow-sm">
        <h2 className="font-semibold">Templates</h2>
        <TextInput label="Réponse initiale" value={data.templates?.firstReply} onChange={v=>setData({...data, templates:{...(data.templates||{}), firstReply:v}})}/>
        <TextInput label="Template WhatsApp" value={data.templates?.whatsappTemplate} onChange={v=>setData({...data, templates:{...(data.templates||{}), whatsappTemplate:v}})}/>
        <TextInput label="Disclaimer" value={data.templates?.disclaimer} onChange={v=>setData({...data, templates:{...(data.templates||{}), disclaimer:v}})}/>
      </section>
    </div>
  );
}

function DynamicList({items, onChange, fields}:{items:any[]; onChange:(items:any[])=>void; fields:string[]}) {
  const [local, setLocal] = useState<any[]>(items);
  useEffect(()=>setLocal(items), [items]);
  const add = ()=>{ setLocal([...local, {}]); };
  const save = ()=> onChange(local);
  return (
    <div className="space-y-2">
      {local.map((row, i)=> (
        <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
          {fields.map((f)=> (
            <input key={f} className="rounded-xl border p-2" placeholder={f} value={Array.isArray(row[f])? row[f].join(' | ') : (row[f] || '')}
              onChange={(e)=>{
                const val = e.target.value;
                row[f] = (f==='steps' || f==='docsRequired' || f==='links') ? val.split('|').map(s=>s.trim()).filter(Boolean) : val;
                setLocal([...local]);
              }} />
          ))}
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={add} className="px-3 py-1 rounded-xl border">Ajouter</button>
        <button onClick={save} className="px-3 py-1 rounded-xl bg-indigo-600 text-white">Appliquer</button>
      </div>
    </div>
  );
}
