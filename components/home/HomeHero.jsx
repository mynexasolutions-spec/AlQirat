"use client";

import { useEffect, useState } from "react";
import SmartImage from "../SmartImage";
import { useStorefrontContent } from "../useStorefrontData";
import { brand } from "@/lib/brand";
import { isComboHeroSlide } from "@/lib/heroSlides";

// "Fragrances That Define You" -> "Fragrances" / "That Define You"
function splitTitle(title) {
  const words = title.trim().split(/\s+/);
  return words.length >= 3 ? [words[0], words.slice(1).join(" ")] : [title];
}

export default function HomeHero({ initialContent }) {
  const { data } = useStorefrontContent(initialContent);
  const comboOffer = data.combo_offer;
  const slides = (data.hero_slides || [])
    .filter((item) => !isComboHeroSlide(item) || !comboOffer || comboOffer.is_active !== false)
    .map((item) => isComboHeroSlide(item) && comboOffer ? {
      ...item,
      title: item.title || comboOffer.title,
      subtitle: item.subtitle || comboOffer.subtitle,
      desktop_image_url: comboOffer.banner_image_url || item.desktop_image_url,
      mobile_image_url: comboOffer.mobile_banner_image_url || comboOffer.banner_image_url || item.mobile_image_url,
      cta_label: comboOffer.cta_label || item.cta_label,
      cta_href: comboOffer.cta_href || item.cta_href,
    } : item);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const id = setInterval(() => setActive((value) => (value + 1) % slides.length), 3000);
    return () => clearInterval(id);
  }, [slides.length]);

  // Hero slides are managed in the admin dashboard; with none active there is no hero.
  if (!slides.length) return null;

  const activeIndex = active % slides.length;
  const slide = slides[activeIndex];
  const comboSlide = isComboHeroSlide(slide);
  const lines = splitTitle(slide.title || "");
  const desktopLines = comboSlide ? [slide.title || ""] : lines;

  function openComboOffer(event) {
    if (!comboSlide || event.target.closest("a, button")) return;
    window.location.assign("/combo");
  }

  return (
    <section
      className={`relative isolate overflow-hidden bg-sage-light ${comboSlide ? "cursor-pointer" : ""}`}
      onClick={openComboOffer}
      onKeyDown={(event) => {
        if (comboSlide && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          window.location.assign("/combo");
        }
      }}
      tabIndex={comboSlide ? 0 : undefined}
      aria-label={comboSlide ? "Open Shop Combos" : undefined}
    >
      {slides.map((item, index) => (
        <div
          key={item.id || index}
          className={`absolute inset-0 -z-20 transition-opacity duration-1000 ease-in-out ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
        >
          <SmartImage
            src={item.desktop_image_url}
            tone="from-sage to-cream"
            imageKitTransform="f-auto,q-75,w-1920"
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            className="absolute inset-0 hidden md:block"
            imgClassName="h-full w-full object-cover object-[75%_center]"
          />
          <SmartImage
            src={item.mobile_image_url || item.desktop_image_url}
            tone="from-sage to-cream"
            imageKitTransform="f-auto,q-75,w-1080"
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            className="absolute inset-0 md:hidden"
            imgClassName={`h-full w-full object-cover ${String(item.mobile_image_url || item.desktop_image_url).includes("perfume_banner") ? "object-[72%_bottom]" : "object-bottom"}`}
          />
        </div>
      ))}
      {comboSlide && <a href="/combo" aria-label={slide.title || "View combo offer"} className="absolute inset-0 z-0" />}
      {/* keeps the copy readable whatever image the admin uploads */}
      {!comboSlide && <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sage-light/70 via-sage-light/25 to-transparent md:from-sage-light/90 md:via-sage-light/60 md:via-40% md:to-transparent md:to-70%" />}

      {comboSlide && (
        <div className="pointer-events-none absolute inset-x-5 top-12 z-10 md:hidden">
          <h1 className="font-serif text-4xl font-semibold leading-tight text-ink drop-shadow-[0_2px_12px_rgba(255,255,255,0.8)]">
            {lines.map((line) => <span key={line} className="block">{line}</span>)}
          </h1>
          {slide.subtitle && <p className="mt-3 max-w-[280px] text-sm font-medium leading-5 text-ink/80 drop-shadow-[0_1px_8px_rgba(255,255,255,0.9)]">{slide.subtitle}</p>}
        </div>
      )}

      <div className="container-site relative z-10 flex min-h-[720px] flex-col pb-16 pt-12 md:min-h-[560px] md:justify-center md:pt-16 lg:min-h-[640px]">
        <div className="max-w-[560px]">
          <div className={comboSlide ? "invisible md:visible" : ""}>
            <h1
              key={slide.id || activeIndex}
              className={comboSlide
                ? "animate-fade-up font-serif text-[clamp(36px,3.25vw,54px)] font-semibold leading-[1.08] text-ink md:max-w-[620px]"
                : "animate-fade-up font-serif text-[clamp(44px,6vw,78px)] font-semibold leading-[1.04] text-ink"}
            >
              {desktopLines.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </h1>

            <div className={`${comboSlide ? "mt-4" : "mt-6"} animate-fade-up [animation-delay:150ms]`}>
              <span aria-hidden="true" className="flex items-center gap-2">
                <span className="h-px w-24 bg-gold/70" />
                <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
                <span className="h-px w-24 bg-gold/70" />
              </span>
              <p className="mt-4 text-[11.5px] font-medium uppercase tracking-[0.3em] text-ink/80">{brand.heroTagline}</p>
            </div>

            <p className={`${comboSlide ? "mt-4" : "mt-6"} max-w-[250px] animate-fade-up text-[15.5px] leading-relaxed text-ink/75 [animation-delay:250ms] md:max-w-[440px]`}>
              {slide.subtitle}
            </p>
          </div>

          <a href={comboSlide ? "/combo" : slide.cta_href || "/shop"} className={`btn-forest relative z-20 ${comboSlide ? "mt-5" : "mt-8"} inline-flex animate-fade-up !px-7 [animation-delay:350ms]`}>
            {slide.cta_label || "Shop Now"}
          </a>

        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 gap-2 md:flex">
          {slides.map((item, index) => (
            <button
              key={item.id || index}
              type="button"
              aria-label={`Show slide ${index + 1}`}
              onClick={(event) => {
                event.stopPropagation();
                setActive(index);
              }}
              className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-8 bg-ink" : "w-3 bg-ink/30"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
