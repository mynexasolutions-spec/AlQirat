import { NextResponse } from "next/server";
import { createAdminCatalogClient, isAuthorizedAdminRequest } from "@/lib/adminCatalog";
import { heroSlideFieldsFromComboOffer } from "@/lib/heroSlides";

const offerFields = ["name", "title", "subtitle", "description", "banner_image_url", "mobile_banner_image_url", "cta_label", "cta_href", "default_unit_price", "combo_price", "bundle_quantity", "min_quantity", "max_quantity", "max_quantity_per_product", "allow_same_product", "allow_mixed_products", "is_active"];

function unauthorized() {
  return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
}

async function readOffer() {
  const supabase = createAdminCatalogClient();
  const [{ data: offer, error: offerError }, { data: products, error: productsError }, { data: mappings, error: mappingsError }] = await Promise.all([
    supabase.from("combo_offers").select("*").eq("slug", "choose-any-3").maybeSingle(),
    supabase.from("products").select("id,name,slug,price,stock_quantity,image_url,is_active").order("created_at"),
    supabase.from("combo_offer_products").select("offer_id,product_id,unit_price,sort_order,is_active").order("sort_order"),
  ]);
  const error = offerError || productsError || mappingsError;
  if (error) throw new Error(error.message);
  const mappingByProduct = new Map((mappings || []).filter((item) => item.offer_id === offer?.id).map((item) => [item.product_id, item]));
  return {
    offer,
    products: (products || []).map((product) => ({ ...product, combo_unit_price: mappingByProduct.get(product.id)?.unit_price ?? null, combo_active: Boolean(mappingByProduct.get(product.id)?.is_active) })),
  };
}

function numberField(value, label, integer = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) throw new Error(`${label} must be a valid ${integer ? "whole number" : "number"}.`);
  return number;
}

function offerPayload(input) {
  const defaultUnitPrice = numberField(input.default_unit_price, "Default individual price");
  const comboPrice = numberField(input.combo_price, "Combo price");
  const bundleQuantity = numberField(input.bundle_quantity, "Bundle quantity", true);
  const minQuantity = numberField(input.min_quantity, "Minimum quantity", true);
  const maxQuantity = numberField(input.max_quantity, "Maximum quantity", true);
  const maxPerProduct = numberField(input.max_quantity_per_product, "Maximum quantity per product", true);
  if (!bundleQuantity || !minQuantity || maxQuantity < minQuantity || !maxPerProduct) throw new Error("Quantity rules are invalid.");
  return {
    slug: "choose-any-3",
    name: String(input.name || "").trim(),
    title: String(input.title || "").trim(),
    subtitle: String(input.subtitle || "").trim() || null,
    description: String(input.description || "").trim() || null,
    banner_image_url: String(input.banner_image_url || "").trim() || null,
    mobile_banner_image_url: String(input.mobile_banner_image_url || "").trim() || null,
    cta_label: String(input.cta_label || "Shop Combos").trim(),
    cta_href: String(input.cta_href || "/combo").trim(),
    default_unit_price: defaultUnitPrice,
    combo_price: comboPrice,
    bundle_quantity: bundleQuantity,
    min_quantity: minQuantity,
    max_quantity: maxQuantity,
    max_quantity_per_product: maxPerProduct,
    allow_same_product: input.allow_same_product !== false,
    allow_mixed_products: input.allow_mixed_products !== false,
    is_active: input.is_active === true,
  };
}

export async function GET(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  try {
    return NextResponse.json(await readOffer());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  try {
    const body = await request.json();
    const offer = offerPayload(body.offer || {});
    if (!offer.name || !offer.title) throw new Error("Offer name and title are required.");
    const requestedProducts = Array.isArray(body.products) ? body.products : [];
    const uniqueProducts = [...new Map(requestedProducts.map((product) => [String(product.product_id), product])).values()];
    const supabase = createAdminCatalogClient();
    const { data: catalogProducts, error: catalogError } = uniqueProducts.length
      ? await supabase.from("products").select("id").in("id", uniqueProducts.map((product) => product.product_id)).eq("is_active", true)
      : { data: [], error: null };
    if (catalogError) throw new Error(catalogError.message);
    if (catalogProducts.length !== uniqueProducts.length) throw new Error("Every selected combo product must be active in the catalog.");
    if (offer.is_active && uniqueProducts.length === 0) throw new Error("Select at least one eligible product before activating the offer.");
    for (const product of uniqueProducts) numberField(product.unit_price, "Individual combo price");

    const existing = await supabase.from("combo_offers").select("id").eq("slug", "choose-any-3").maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    const saved = existing.data
      ? await supabase.from("combo_offers").update(offer).eq("id", existing.data.id).select().single()
      : await supabase.from("combo_offers").insert(offer).select().single();
    if (saved.error) throw new Error(saved.error.message);

    const { error: deleteError } = await supabase.from("combo_offer_products").delete().eq("offer_id", saved.data.id);
    if (deleteError) throw new Error(deleteError.message);
    if (uniqueProducts.length) {
      const { error: insertError } = await supabase.from("combo_offer_products").insert(uniqueProducts.map((product, index) => ({ offer_id: saved.data.id, product_id: product.product_id, unit_price: Number(product.unit_price), sort_order: Number(product.sort_order ?? index), is_active: product.is_active !== false })));
      if (insertError) throw new Error(insertError.message);
    }
    const { error: heroSyncError } = await supabase
      .from("hero_slides")
      .update(heroSlideFieldsFromComboOffer(saved.data))
      .or("desktop_image_url.eq./COMBO.png,cta_href.eq./combo");
    if (heroSyncError) throw new Error(`Unable to sync the combo hero slide: ${heroSyncError.message}`);
    return NextResponse.json(await readOffer());
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to save the combo offer." }, { status: 400 });
  }
}
