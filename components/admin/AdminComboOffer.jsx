"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, Save, Upload } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { uploadImage } from "@/lib/uploadImage";
import { notifyStorefrontUpdate } from "@/lib/storefrontSync";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-gold focus:ring-4 focus:ring-gold/10";

function initialForm(offer) {
  return offer ? {
    name: offer.name || "",
    title: offer.title || "",
    subtitle: offer.subtitle || "",
    description: offer.description || "",
    banner_image_url: offer.banner_image_url || "",
    mobile_banner_image_url: offer.mobile_banner_image_url || "",
    cta_label: offer.cta_label || "Shop Combos",
    cta_href: offer.cta_href || "/combo",
    default_unit_price: offer.default_unit_price ?? "",
    combo_price: offer.combo_price ?? "",
    bundle_quantity: offer.bundle_quantity ?? "",
    min_quantity: offer.min_quantity ?? "",
    max_quantity: offer.max_quantity ?? "",
    max_quantity_per_product: offer.max_quantity_per_product ?? "",
    allow_same_product: offer.allow_same_product !== false,
    allow_mixed_products: offer.allow_mixed_products !== false,
    is_active: offer.is_active === true,
  } : null;
}

export default function AdminComboOffer() {
  const [offer, setOffer] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/combo-offer", { cache: "no-store" });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error || "Unable to load combo settings.");
    setOffer(result.offer);
    setForm(initialForm(result.offer));
    setProducts(result.products || []);
    setSelected(Object.fromEntries((result.products || []).filter((product) => product.combo_active).map((product) => [product.id, { unit_price: product.combo_unit_price, sort_order: product.sort_order || 0 }])));
  }

  useEffect(() => { load(); }, []);

  const selectedCount = Object.keys(selected).length;
  const selectedNames = useMemo(() => products.filter((product) => selected[product.id]).map((product) => product.name), [products, selected]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleProduct(product) {
    setSelected((current) => {
      if (current[product.id]) {
        const next = { ...current };
        delete next[product.id];
        return next;
      }
      return { ...current, [product.id]: { unit_price: form.default_unit_price, sort_order: products.findIndex((item) => item.id === product.id) } };
    });
  }

  async function uploadBanner(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(field);
    setError("");
    try { setField(field, await uploadImage(file, "/al-qirat/combo-offers")); } catch (uploadError) { setError(uploadError.message); } finally { setUploading(""); event.target.value = ""; }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/combo-offer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer: form, products: Object.entries(selected).map(([product_id, value]) => ({ product_id, ...value })) }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setError(result.error || "Unable to save combo settings.");
    setOffer(result.offer); setForm(initialForm(result.offer)); setProducts(result.products || []); setMessage("Combo offer saved and synced to the storefront.");
    notifyStorefrontUpdate("combo"); notifyStorefrontUpdate("content");
  }

  if (loading || !form) return <p className="p-8 text-sm text-stone-500">Loading combo offer...</p>;

  return <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"><div className="border-b border-stone-200 px-5 py-5 sm:px-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark"><Gift size={15} /> Storefront offer</p><h2 className="mt-1 text-2xl font-bold">Combo Offer</h2><p className="mt-1 text-sm text-stone-500">Control the eligible products, prices, quantity rules, banner, and availability for the choose-any combo.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase ${form.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{form.is_active ? "Active" : "Paused"}</span></div></div>
    <form onSubmit={save} className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7"><label className="text-sm font-semibold">Internal name<input value={form.name} onChange={(event) => setField("name", event.target.value)} required className={inputClass} /></label><label className="text-sm font-semibold">Homepage/page title<input value={form.title} onChange={(event) => setField("title", event.target.value)} required className={inputClass} /></label><label className="text-sm font-semibold sm:col-span-2">Subtitle<input value={form.subtitle} onChange={(event) => setField("subtitle", event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold sm:col-span-2">Description<textarea value={form.description} onChange={(event) => setField("description", event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-gold" /></label>
      <p className="text-xs leading-relaxed text-stone-500 sm:col-span-2">These banners are stored in Supabase after ImageKit upload and are synchronized with the matching homepage combo hero slide.</p>
      {[['banner_image_url', 'Desktop banner'], ['mobile_banner_image_url', 'Mobile banner']].map(([field, label]) => <div key={field}><label className="text-sm font-semibold">{label}<div className="mt-2 flex gap-2"><input value={form[field]} onChange={(event) => setField(field, event.target.value)} className={`${inputClass} mt-0 flex-1`} placeholder="Image URL" /><label className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-stone-200 px-3 text-sm font-semibold hover:border-gold"><Upload size={15} />{uploading === field ? "Uploading" : "Upload"}<input type="file" accept="image/*" onChange={(event) => uploadBanner(event, field)} className="sr-only" disabled={Boolean(uploading)} /></label></div></label>{form[field] && <SmartImage src={form[field]} alt="" className="mt-3 h-24 rounded-xl" imgClassName="h-full w-full object-cover" />}</div>)}
      <label className="text-sm font-semibold">Button label<input value={form.cta_label} onChange={(event) => setField("cta_label", event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold">Offer page path<input value={form.cta_href} onChange={(event) => setField("cta_href", event.target.value)} className={inputClass} /></label>
      <div className="sm:col-span-2"><h3 className="text-lg font-bold">Pricing and quantity rules</h3><p className="mt-1 text-sm text-stone-500">These values are saved to Supabase and enforced again when the customer checks out.</p></div>
      <label className="text-sm font-semibold">Default individual price (₹)<input value={form.default_unit_price} onChange={(event) => setField("default_unit_price", event.target.value)} type="number" min="0" step="0.01" required className={inputClass} /></label><label className="text-sm font-semibold">Bundle price (₹)<input value={form.combo_price} onChange={(event) => setField("combo_price", event.target.value)} type="number" min="0" step="0.01" required className={inputClass} /></label><label className="text-sm font-semibold">Perfumes per bundle<input value={form.bundle_quantity} onChange={(event) => setField("bundle_quantity", event.target.value)} type="number" min="1" step="1" required className={inputClass} /></label><label className="text-sm font-semibold">Minimum selected<input value={form.min_quantity} onChange={(event) => setField("min_quantity", event.target.value)} type="number" min="1" step="1" required className={inputClass} /></label><label className="text-sm font-semibold">Maximum selected<input value={form.max_quantity} onChange={(event) => setField("max_quantity", event.target.value)} type="number" min="1" step="1" required className={inputClass} /></label><label className="text-sm font-semibold">Maximum per perfume<input value={form.max_quantity_per_product} onChange={(event) => setField("max_quantity_per_product", event.target.value)} type="number" min="1" step="1" required className={inputClass} /></label>
      <div className="flex flex-wrap gap-5 sm:col-span-2"><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.allow_same_product} onChange={(event) => setField("allow_same_product", event.target.checked)} className="h-4 w-4 accent-[#C99A4B]" />Allow repeated perfume</label><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.allow_mixed_products} onChange={(event) => setField("allow_mixed_products", event.target.checked)} className="h-4 w-4 accent-[#C99A4B]" />Allow mixed perfumes</label><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={(event) => setField("is_active", event.target.checked)} className="h-4 w-4 accent-[#C99A4B]" />Offer active on storefront</label></div>
      <div className="rounded-2xl border border-gold/25 bg-cream/50 p-4 sm:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Eligible perfumes</h3><p className="mt-1 text-sm text-stone-500">{selectedCount} enabled · every catalog product is listed below.</p></div><span className="text-xs font-semibold text-gold-dark">Enabled products use their configured combo price.</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => { const active = Boolean(selected[product.id]); const inactive = !product.is_active; return <div key={product.id} className={`flex gap-3 rounded-xl border bg-white p-3 ${active ? "border-gold ring-1 ring-gold/30" : "border-stone-200"}`}><input type="checkbox" checked={active} disabled={inactive && !active} onChange={() => toggleProduct(product)} className="mt-1 h-4 w-4 accent-[#C99A4B]" aria-label={`${active ? "Disable" : "Enable"} ${product.name}`} /><SmartImage src={product.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg" imgClassName="h-full w-full object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold">{product.name}</p>{inactive && <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">Inactive</span>}</div>{active ? <input value={selected[product.id].unit_price} onChange={(event) => setSelected((current) => ({ ...current, [product.id]: { ...current[product.id], unit_price: event.target.value } }))} type="number" min="0" step="0.01" className="mt-2 h-9 w-full rounded-lg border border-stone-200 px-2 text-sm outline-none focus:border-gold" aria-label={`Combo price for ${product.name}`} /> : <p className="mt-1 text-xs text-stone-500">Catalog price ₹{product.price}</p>}</div></div>; })}</div></div>
      {selectedNames.length > 0 && <p className="text-xs text-stone-500 sm:col-span-2">Selected: {selectedNames.join(" · ")}</p>}{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:col-span-2">{message}</p>}<button disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"><Save size={16} />{saving ? "Saving..." : "Save Combo Offer"}</button>
    </form>
  </section>;
}
