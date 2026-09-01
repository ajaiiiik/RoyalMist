const getEffectivePrice = (product, categoryOffer = null) => {
  const now = new Date();
  let bestDiscount = 0;
  let offerLabel   = "";

  // Product level offer
  if (
    product.offer &&
    product.offer.isActive &&
    product.offer.discountValue > 0 &&
    (!product.offer.startDate || new Date(product.offer.startDate) <= now) &&
    (!product.offer.endDate   || new Date(product.offer.endDate)   >= now)
  ) {
    const basePrice = product.volumes?.[0]?.price || 0;
    let disc = 0;
    if (product.offer.discountType === "percentage") {
      disc = Math.round((basePrice * product.offer.discountValue) / 100);
    } else {
      disc = product.offer.discountValue;
    }
    if (disc > bestDiscount) {
      bestDiscount = disc;
      offerLabel   = product.offer.offerLabel || `${product.offer.discountValue}${product.offer.discountType === "percentage" ? "%" : "₹"} OFF`;
    }
  }

  // Category level offer
  if (
    categoryOffer &&
    categoryOffer.isActive &&
    categoryOffer.discountValue > 0 &&
    (!categoryOffer.startDate || new Date(categoryOffer.startDate) <= now) &&
    (!categoryOffer.endDate   || new Date(categoryOffer.endDate)   >= now)
  ) {
    const basePrice = product.volumes?.[0]?.price || 0;
    let disc = 0;
    if (categoryOffer.discountType === "percentage") {
      disc = Math.round((basePrice * categoryOffer.discountValue) / 100);
    } else {
      disc = categoryOffer.discountValue;
    }
    if (disc > bestDiscount) {
      bestDiscount = disc;
      offerLabel   = categoryOffer.offerLabel || `${categoryOffer.discountValue}${categoryOffer.discountType === "percentage" ? "%" : "₹"} OFF`;
    }
  }

  // Apply best discount to all volumes
  const discountedVolumes = (product.volumes || []).map(vol => {
    const discountedPrice = Math.max(0, vol.price - bestDiscount);
    return { ...vol, originalPrice: vol.price, discountedPrice };
  });

  return {
    hasOffer:          bestDiscount > 0,
    discount:          bestDiscount,
    offerLabel,
    discountedVolumes,
    originalBasePrice: product.volumes?.[0]?.price || 0,
    discountedBasePrice: Math.max(0, (product.volumes?.[0]?.price || 0) - bestDiscount),
  };
};

module.exports = { getEffectivePrice };
