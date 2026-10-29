import { NextResponse } from "next/server";
import { createAdminCatalogClient, isAuthorizedAdminRequest } from "@/lib/adminCatalog";
import { comboOfferFieldsFromHeroSlide, isComboHeroSlide } from "@/lib/heroSlides";

const resources = {
  "hero-slides": {
    table: "hero_slides",
    fields: ["title", "subtitle", "desktop_image_url", "mobile_image_url", "cta_label", "cta_href", "sort_order", "is_active"],
    required: ["title", "desktop_image_url"],
  },
  announcements: { table: "announcements", fields: ["message", "sort_order", "is_active"], required: ["message"] },
  faqs: { table: "faqs", fields: ["question", "answer", "sort_order", "is_active"], required: ["question", "answer"] },
};

function unauthorized() {
  return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
}

function configuration(resource) {
  return resources[resource] || null;
}

function payloadFor(config, body) {
  const payload = Object.fromEntries(config.fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
  for (const field of config.required) {
    if (typeof payload[field] !== "string" || !payload[field].trim()) throw new Error(`${field.replaceAll("_", " ")} is required.`);
    payload[field] = payload[field].trim();
  }
  for (const field of config.fields) {
    if (typeof payload[field] === "string") payload[field] = payload[field].trim() || null;
  }
  if (Object.hasOwn(payload, "sort_order")) {
    payload.sort_order = Number(payload.sort_order);
    if (!Number.isInteger(payload.sort_order)) throw new Error("Sort order must be a whole number.");
  }
  if (Object.hasOwn(payload, "is_active")) payload.is_active = payload.is_active !== false;
  return payload;
}

async function syncComboOfferFromHeroSlide(supabase, slide) {
  if (!isComboHeroSlide(slide)) return;
  const { error } = await supabase
    .from("combo_offers")
    .update(comboOfferFieldsFromHeroSlide(slide))
    .eq("slug", "choose-any-3");
  if (error) throw new Error(`Unable to sync the combo offer banner: ${error.message}`);
}

export async function GET(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const config = configuration(params.resource);
  if (!config) return NextResponse.json({ error: "Unknown content resource." }, { status: 404 });
  const { data, error } = await createAdminCatalogClient().from(config.table).select("*").order("sort_order").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const config = configuration(params.resource);
  if (!config) return NextResponse.json({ error: "Unknown content resource." }, { status: 404 });
  try {
    const supabase = createAdminCatalogClient();
    const { data, error } = await supabase.from(config.table).insert(payloadFor(config, await request.json())).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await syncComboOfferFromHeroSlide(supabase, data);
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const config = configuration(params.resource);
  if (!config) return NextResponse.json({ error: "Unknown content resource." }, { status: 404 });
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "Record id is required." }, { status: 400 });
    const supabase = createAdminCatalogClient();
    const { data, error } = await supabase.from(config.table).update(payloadFor(config, body)).eq("id", body.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await syncComboOfferFromHeroSlide(supabase, data);
    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const config = configuration(params.resource);
  if (!config) return NextResponse.json({ error: "Unknown content resource." }, { status: 404 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Record id is required." }, { status: 400 });
  const { error } = await createAdminCatalogClient().from(config.table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
