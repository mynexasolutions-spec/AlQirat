export function isComboHeroSlide(slide) {
  return slide?.cta_href === "/combo" || slide?.desktop_image_url === "/COMBO.png";
}

export function comboOfferFieldsFromHeroSlide(slide) {
  return {
    title: slide.title?.trim() || "Choose Any 3 Perfumes",
    subtitle: slide.subtitle?.trim() || null,
    banner_image_url: slide.desktop_image_url?.trim() || null,
    mobile_banner_image_url: slide.mobile_image_url?.trim() || null,
    cta_label: slide.cta_label?.trim() || "Shop Combos",
    cta_href: slide.cta_href?.trim() || "/combo",
  };
}

export function heroSlideFieldsFromComboOffer(offer) {
  return {
    title: offer.title?.trim() || "Choose Any 3 Perfumes",
    subtitle: offer.subtitle?.trim() || null,
    ...(offer.banner_image_url?.trim() ? { desktop_image_url: offer.banner_image_url.trim() } : {}),
    mobile_image_url: offer.mobile_banner_image_url?.trim() || offer.banner_image_url?.trim() || null,
    cta_label: offer.cta_label?.trim() || "Shop Combos",
    cta_href: offer.cta_href?.trim() || "/combo",
  };
}
