// ═══════════════════════════════════════════
// ClimaStyle — Recommendations Engine
// Clothing recommendations based on weather,
// time range, occasion and gender
// ═══════════════════════════════════════════

/**
 * Generate clothing recommendations.
 *
 * @param {HourlyData[]} hourlyRange - Weather data for the time range
 * @param {string} occasion - 'trabajo' | 'estudio' | 'salida' | 'especial'
 * @param {string} gender - 'masculino' | 'femenino' | 'neutro'
 * @param {string[]} styles - Array of preferred styles
 * @returns {Recommendation}
 *
 * @typedef {Object} Recommendation
 * @property {OutfitItem[]} outfit
 * @property {OutfitItem[]} accessories
 * @property {string[]} tips
 * @property {string} summary
 * @property {Object} conditions - { tempMin, tempMax, feelsMin, hasRain, hasStrongWind, maxUV, hasNightHours, thermalAmplitude }
 */
export function getRecommendation(hourlyRange, occasion = 'trabajo', gender = 'masculino') {
  if (!hourlyRange || hourlyRange.length === 0) {
    return getDefaultRecommendation();
  }

  // ── Analyze conditions across the entire range ──
  const conditions = analyzeConditions(hourlyRange);
  const tempCategory = getTempCategory(conditions.feelsMin);

  // ── Build outfit ──
  const outfit = buildOutfit(tempCategory, occasion, gender, conditions);
  const accessories = buildAccessories(conditions, occasion);
  const tips = buildTips(conditions, occasion);

  // ── Summary ──
  const summary = buildSummary(conditions);

  return { outfit, accessories, tips, summary, conditions };
}

// ════════════════════════════════════════
// Condition Analysis
// ════════════════════════════════════════

function analyzeConditions(hourlyRange) {
  const temps = hourlyRange.map(h => h.temp);
  const feelsTemps = hourlyRange.map(h => h.feelsLike);
  const precipProbs = hourlyRange.map(h => h.precipProb);
  const windSpeeds = hourlyRange.map(h => h.windSpeed);
  const uvValues = hourlyRange.map(h => h.uvIndex).filter(v => v != null);
  const weatherCodes = hourlyRange.map(h => h.weatherCode);

  const tempMin = Math.min(...temps);
  const tempMax = Math.max(...temps);
  const feelsMin = Math.min(...feelsTemps);
  const feelsMax = Math.max(...feelsTemps);

  return {
    tempMin: Math.round(tempMin),
    tempMax: Math.round(tempMax),
    feelsMin: Math.round(feelsMin),
    feelsMax: Math.round(feelsMax),
    thermalAmplitude: Math.round(tempMax - tempMin),
    hasRain: precipProbs.some(p => p > 30) || weatherCodes.some(c => c >= 51),
    hasHeavyRain: precipProbs.some(p => p > 60) || weatherCodes.some(c => c >= 63),
    hasStrongWind: windSpeeds.some(w => w > 30),
    hasModerateWind: windSpeeds.some(w => w > 20),
    maxWind: Math.round(Math.max(...windSpeeds)),
    maxUV: uvValues.length > 0 ? Math.round(Math.max(...uvValues)) : 0,
    hasNightHours: hourlyRange.some(h => !h.isDay),
    hasSnow: weatherCodes.some(c => c >= 71 && c <= 77),
    hasFog: weatherCodes.some(c => c === 45 || c === 48),
    hasThunderstorm: weatherCodes.some(c => c >= 95),
    maxPrecipProb: Math.max(...precipProbs),
    avgHumidity: Math.round(hourlyRange.reduce((s, h) => s + h.humidity, 0) / hourlyRange.length)
  };
}

function getTempCategory(feelsLike) {
  if (feelsLike > 30) return 'extreme-hot';
  if (feelsLike > 25) return 'hot';
  if (feelsLike > 20) return 'warm';
  if (feelsLike > 15) return 'mild';
  if (feelsLike > 10) return 'cool';
  if (feelsLike > 5) return 'cold';
  return 'freezing';
}

// ════════════════════════════════════════
// Outfit Database
// ════════════════════════════════════════

/**
 * @typedef {Object} OutfitItem
 * @property {string} emoji
 * @property {string} type - Category name
 * @property {string} description - Specific item description
 * @property {string} detail - Color/material suggestion
 */

const OUTFITS = {
  // ── TRABAJO (Semi-formal) ──
  trabajo: {
    masculino: {
      'extreme-hot': [
        { emoji: '👔', type: 'Camisa', description: 'Camisa manga corta o polo', detail: 'Colores claros: celeste, blanco o beige' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de tela liviana', detail: 'Beige, gris claro o azul marino' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos ventilados o mocasines', detail: 'Marrón claro o azul' }
      ],
      hot: [
        { emoji: '👔', type: 'Camisa', description: 'Camisa manga corta', detail: 'Celeste, blanco o lila claro' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de tela', detail: 'Gris, beige o azul marino' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos de cuero o mocasines', detail: 'Marrón o negro' }
      ],
      warm: [
        { emoji: '👔', type: 'Camisa', description: 'Camisa manga larga (arremangar)', detail: 'Celeste, blanco o estampado sutil' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de vestir', detail: 'Gris oscuro, azul marino o negro' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos de cuero', detail: 'Negro o marrón' }
      ],
      mild: [
        { emoji: '👔', type: 'Camisa', description: 'Camisa manga larga', detail: 'Blanco, celeste o rayada' },
        { emoji: '🧥', type: 'Capa', description: 'Blazer o chaqueta liviana', detail: 'Azul marino, gris o negro' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de vestir', detail: 'Gris oscuro o azul marino' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos de cuero', detail: 'Negro o marrón oscuro' }
      ],
      cool: [
        { emoji: '👔', type: 'Camisa', description: 'Camisa manga larga', detail: 'Colores sobrios' },
        { emoji: '🧶', type: 'Capa media', description: 'Sweater o chaleco de punto', detail: 'Gris, azul o burdeos' },
        { emoji: '🧥', type: 'Abrigo', description: 'Blazer o chaqueta media', detail: 'Azul marino, gris o negro' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de vestir', detail: 'Gris oscuro o negro' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos cerrados de cuero', detail: 'Negro' }
      ],
      cold: [
        { emoji: '👔', type: 'Base', description: 'Camisa + camiseta térmica', detail: 'Blanco o gris interior' },
        { emoji: '🧶', type: 'Capa media', description: 'Sweater grueso', detail: 'Azul marino, gris o negro' },
        { emoji: '🧥', type: 'Abrigo', description: 'Abrigo o parka formal', detail: 'Negro, gris o azul oscuro' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de tela gruesa', detail: 'Gris oscuro o negro' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos cerrados abrigados', detail: 'Negro o marrón oscuro' }
      ],
      freezing: [
        { emoji: '🧣', type: 'Base térmica', description: 'Camiseta térmica + camisa', detail: 'Capas ajustadas al cuerpo' },
        { emoji: '🧶', type: 'Capa media', description: 'Sweater grueso de lana', detail: 'Colores oscuros' },
        { emoji: '🧥', type: 'Abrigo', description: 'Abrigo grueso o parka', detail: 'Negro o gris oscuro' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón grueso', detail: 'Negro o gris' },
        { emoji: '🥾', type: 'Calzado', description: 'Botines o zapatos abrigados', detail: 'Oscuros, impermeables' }
      ]
    },
    femenino: {
      'extreme-hot': [
        { emoji: '👗', type: 'Parte superior', description: 'Blusa manga corta o top elegante', detail: 'Colores claros o pasteles' },
        { emoji: '👖', type: 'Parte inferior', description: 'Falda midi o pantalón liviano', detail: 'Beige, blanco o azul claro' },
        { emoji: '👠', type: 'Calzado', description: 'Sandalias elegantes o ballerinas', detail: 'Nude, negro o colores neutros' }
      ],
      hot: [
        { emoji: '👗', type: 'Parte superior', description: 'Blusa fresca o vestido recto', detail: 'Colores pasteles o neutros' },
        { emoji: '👖', type: 'Parte inferior', description: 'Pantalón liviano o falda', detail: 'Beige, azul marino o negro' },
        { emoji: '👠', type: 'Calzado', description: 'Ballerinas o zapatos bajos', detail: 'Nude o negro' }
      ],
      warm: [
        { emoji: '👗', type: 'Parte superior', description: 'Blusa manga larga o vestido', detail: 'Colores suaves o estampado discreto' },
        { emoji: '👖', type: 'Parte inferior', description: 'Pantalón de tela o falda midi', detail: 'Negro, gris o azul marino' },
        { emoji: '👠', type: 'Calzado', description: 'Zapatos cerrados bajos', detail: 'Negro, nude o burdeos' }
      ],
      mild: [
        { emoji: '👗', type: 'Parte superior', description: 'Blusa + blazer liviano', detail: 'Combinación elegante' },
        { emoji: '👖', type: 'Parte inferior', description: 'Pantalón de vestir o falda con medias', detail: 'Tonos oscuros' },
        { emoji: '👠', type: 'Calzado', description: 'Botines o zapatos cerrados', detail: 'Negro o marrón' }
      ],
      cool: [
        { emoji: '👗', type: 'Base', description: 'Blusa manga larga', detail: 'Colores sobrios' },
        { emoji: '🧶', type: 'Capa', description: 'Cardigan o blazer', detail: 'Lana o punto fino' },
        { emoji: '🧥', type: 'Abrigo', description: 'Chaqueta o trench', detail: 'Beige, negro o camel' },
        { emoji: '👖', type: 'Parte inferior', description: 'Pantalón o falda con medias gruesas', detail: 'Oscuros' },
        { emoji: '👢', type: 'Calzado', description: 'Botines o botas cortas', detail: 'Negro o marrón' }
      ],
      cold: [
        { emoji: '👗', type: 'Base', description: 'Camiseta térmica + blusa', detail: 'Capas' },
        { emoji: '🧶', type: 'Capa media', description: 'Sweater grueso', detail: 'Lana, colores neutros' },
        { emoji: '🧥', type: 'Abrigo', description: 'Abrigo largo o parka', detail: 'Negro, gris o camel' },
        { emoji: '👖', type: 'Parte inferior', description: 'Pantalón grueso + medias térmicas', detail: 'Tonos oscuros' },
        { emoji: '👢', type: 'Calzado', description: 'Botas abrigadas', detail: 'Negro, impermeables' }
      ],
      freezing: [
        { emoji: '🧣', type: 'Base', description: 'Capa térmica completa', detail: 'Ajustada al cuerpo' },
        { emoji: '🧶', type: 'Capa media', description: 'Sweater de lana gruesa', detail: 'Colores oscuros' },
        { emoji: '🧥', type: 'Abrigo', description: 'Abrigo largo grueso', detail: 'Negro o gris oscuro' },
        { emoji: '👖', type: 'Parte inferior', description: 'Pantalón grueso térmico', detail: 'Con medias térmicas debajo' },
        { emoji: '🥾', type: 'Calzado', description: 'Botas impermeables abrigadas', detail: 'Oscuras, suela antideslizante' }
      ]
    }
  },

  // ── ESTUDIO (Casual cómodo) ──
  estudio: {
    masculino: {
      'extreme-hot': [
        { emoji: '👕', type: 'Polera', description: 'Polera manga corta de algodón', detail: 'Colores claros, cómoda' },
        { emoji: '🩳', type: 'Short', description: 'Short o bermuda', detail: 'Jeans corto, beige o gris' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas deportivas', detail: 'Ligeras y ventiladas' }
      ],
      hot: [
        { emoji: '👕', type: 'Polera', description: 'Polera manga corta', detail: 'Algodón, color libre' },
        { emoji: '👖', type: 'Pantalón', description: 'Jeans o pantalón liviano', detail: 'Celeste, gris o negro' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas', detail: 'Cómodas para caminar' }
      ],
      warm: [
        { emoji: '👕', type: 'Polera', description: 'Polera manga larga o corta', detail: 'A elección según comodidad' },
        { emoji: '👖', type: 'Pantalón', description: 'Jeans', detail: 'Cualquier color' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas', detail: 'Tu favoritas' }
      ],
      mild: [
        { emoji: '👕', type: 'Polera', description: 'Polera manga larga', detail: 'Algodón o franela' },
        { emoji: '🧥', type: 'Capa', description: 'Polerón con cierre o hoodie', detail: 'Para quitar si hace calor' },
        { emoji: '👖', type: 'Pantalón', description: 'Jeans', detail: 'Cualquier color' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas', detail: 'Cómodas' }
      ],
      cool: [
        { emoji: '👕', type: 'Base', description: 'Polera manga larga', detail: 'Algodón grueso' },
        { emoji: '🧥', type: 'Polerón', description: 'Polerón grueso o hoodie', detail: 'Con cierre para regular' },
        { emoji: '👖', type: 'Pantalón', description: 'Jeans o pantalón grueso', detail: 'Oscuros' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas cerradas', detail: 'Con calcetines gruesos' }
      ],
      cold: [
        { emoji: '👕', type: 'Base', description: 'Polera manga larga o camiseta térmica', detail: 'Capa ajustada' },
        { emoji: '🧶', type: 'Capa media', description: 'Polerón grueso', detail: 'Polar o algodón grueso' },
        { emoji: '🧥', type: 'Parka', description: 'Parka o chaqueta gruesa', detail: 'Con capucha ideal' },
        { emoji: '👖', type: 'Pantalón', description: 'Jeans gruesos', detail: 'Oscuros' },
        { emoji: '🥾', type: 'Calzado', description: 'Zapatillas abrigadas o botines', detail: 'Impermeables si llueve' }
      ],
      freezing: [
        { emoji: '🧣', type: 'Base térmica', description: 'Camiseta térmica', detail: 'Primera capa ajustada' },
        { emoji: '🧶', type: 'Capa media', description: 'Polar + polerón', detail: 'Doble capa media' },
        { emoji: '🧥', type: 'Parka', description: 'Parka gruesa con capucha', detail: 'Impermeable y cortaviento' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón grueso', detail: 'Con calza térmica debajo si es necesario' },
        { emoji: '🥾', type: 'Calzado', description: 'Botas o zapatillas impermeables', detail: 'Con calcetines gruesos de lana' }
      ]
    },
    femenino: {
      'extreme-hot': [
        { emoji: '👕', type: 'Parte superior', description: 'Polera fresca o top', detail: 'Algodón liviano, colores claros' },
        { emoji: '🩳', type: 'Parte inferior', description: 'Short, falda corta o vestido', detail: 'Cómoda para clases' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas o sandalias', detail: 'Ligeras' }
      ],
      hot: [
        { emoji: '👕', type: 'Parte superior', description: 'Polera manga corta', detail: 'Fresca y cómoda' },
        { emoji: '👖', type: 'Parte inferior', description: 'Jeans o falda', detail: 'Livianos' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas', detail: 'Cómodas para el día' }
      ],
      warm: [
        { emoji: '👕', type: 'Parte superior', description: 'Polera o blusa casual', detail: 'Manga corta o larga' },
        { emoji: '👖', type: 'Parte inferior', description: 'Jeans o pantalón cómodo', detail: 'A elección' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas', detail: 'Cómodas' }
      ],
      mild: [
        { emoji: '👕', type: 'Base', description: 'Polera manga larga', detail: 'Cómoda' },
        { emoji: '🧥', type: 'Capa', description: 'Chaqueta liviana o cardigan', detail: 'Para quitar/poner' },
        { emoji: '👖', type: 'Parte inferior', description: 'Jeans o leggins', detail: 'Cómodos para el día' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas', detail: 'Cómodas' }
      ],
      cool: [
        { emoji: '👕', type: 'Base', description: 'Polera manga larga', detail: 'Algodón grueso' },
        { emoji: '🧥', type: 'Polerón', description: 'Polerón o hoodie', detail: 'Abrigado' },
        { emoji: '👖', type: 'Parte inferior', description: 'Jeans o pantalón grueso', detail: 'Con medias' },
        { emoji: '👢', type: 'Calzado', description: 'Zapatillas cerradas o botines', detail: 'Abrigados' }
      ],
      cold: [
        { emoji: '👕', type: 'Base', description: 'Camiseta térmica + polera', detail: 'Capas' },
        { emoji: '🧶', type: 'Capa media', description: 'Polerón grueso', detail: 'Polar o lana' },
        { emoji: '🧥', type: 'Parka', description: 'Parka o chaqueta gruesa', detail: 'Con capucha' },
        { emoji: '👖', type: 'Parte inferior', description: 'Jeans gruesos o pantalón térmico', detail: 'Con medias gruesas' },
        { emoji: '👢', type: 'Calzado', description: 'Botas o zapatillas impermeables', detail: 'Abrigadas' }
      ],
      freezing: [
        { emoji: '🧣', type: 'Base', description: 'Capa térmica completa', detail: 'Primera capa ajustada' },
        { emoji: '🧶', type: 'Capa media', description: 'Polar grueso', detail: 'Doble capa' },
        { emoji: '🧥', type: 'Parka', description: 'Parka gruesa', detail: 'Impermeable, con capucha' },
        { emoji: '👖', type: 'Parte inferior', description: 'Pantalón térmico', detail: 'Con calzas debajo' },
        { emoji: '🥾', type: 'Calzado', description: 'Botas impermeables', detail: 'Con calcetines de lana' }
      ]
    }
  },

  // ── SALIDA (Casual-fashion) ──
  salida: {
    masculino: {
      'extreme-hot': [
        { emoji: '👕', type: 'Polera', description: 'Polera estampada o polo', detail: 'Colores vivos, tela fresca' },
        { emoji: '🩳', type: 'Short', description: 'Short de tela o bermuda', detail: 'Beige, verde o azul' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas blancas o sandalias', detail: 'Look veraniego' }
      ],
      hot: [
        { emoji: '👕', type: 'Polera', description: 'Polera de buen diseño', detail: 'Con estilo, tela fresca' },
        { emoji: '👖', type: 'Pantalón', description: 'Jeans claros o pantalón de lino', detail: 'Relajado pero con estilo' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas urbanas', detail: 'Blancas o de color' }
      ],
      warm: [
        { emoji: '👕', type: 'Polera', description: 'Polera o camisa casual', detail: 'Estilo relajado' },
        { emoji: '👖', type: 'Pantalón', description: 'Jeans o chinos', detail: 'Corte moderno' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas o zapatos casuales', detail: 'Con estilo' }
      ],
      mild: [
        { emoji: '👕', type: 'Base', description: 'Polera manga larga o camisa', detail: 'Estilo casual-chic' },
        { emoji: '🧥', type: 'Chaqueta', description: 'Chaqueta liviana o denim', detail: 'Casual y moderna' },
        { emoji: '👖', type: 'Pantalón', description: 'Jeans o chinos', detail: 'Buen corte' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas urbanas o botines', detail: 'Con actitud' }
      ],
      cool: [
        { emoji: '👕', type: 'Base', description: 'Polera + camisa abierta', detail: 'Estilo en capas' },
        { emoji: '🧥', type: 'Chaqueta', description: 'Chaqueta de cuero o bomber', detail: 'Negro, verde militar o marrón' },
        { emoji: '👖', type: 'Pantalón', description: 'Jeans oscuros', detail: 'Corte recto o slim' },
        { emoji: '🥾', type: 'Calzado', description: 'Botines o zapatillas altas', detail: 'Con estilo urbano' }
      ],
      cold: [
        { emoji: '👕', type: 'Base', description: 'Polera manga larga + camisa', detail: 'Capas con estilo' },
        { emoji: '🧶', type: 'Capa media', description: 'Sweater o hoodie', detail: 'Look urbano' },
        { emoji: '🧥', type: 'Abrigo', description: 'Parka con estilo o chaquetón', detail: 'Negro o colores oscuros' },
        { emoji: '👖', type: 'Pantalón', description: 'Jeans oscuros gruesos', detail: 'Corte moderno' },
        { emoji: '🥾', type: 'Calzado', description: 'Botines', detail: 'Negro o marrón' }
      ],
      freezing: [
        { emoji: '🧣', type: 'Base', description: 'Capas térmicas + sweater', detail: 'Múltiples capas' },
        { emoji: '🧥', type: 'Abrigo', description: 'Abrigo largo o parka premium', detail: 'Con capucha y forro' },
        { emoji: '🧣', type: 'Bufanda', description: 'Bufanda gruesa', detail: 'Complemento de estilo' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón grueso', detail: 'Con capa térmica debajo' },
        { emoji: '🥾', type: 'Calzado', description: 'Botas abrigadas', detail: 'Impermeables' }
      ]
    },
    femenino: {
      'extreme-hot': [
        { emoji: '👗', type: 'Outfit', description: 'Vestido fresco o top + falda', detail: 'Colores vivos, tela ligera' },
        { emoji: '👡', type: 'Calzado', description: 'Sandalias lindas o zapatillas', detail: 'Look de verano' }
      ],
      hot: [
        { emoji: '👗', type: 'Outfit', description: 'Vestido casual o blusa + jeans', detail: 'Fresco pero con estilo' },
        { emoji: '👡', type: 'Calzado', description: 'Sandalias o zapatillas', detail: 'Cómodas y lindas' }
      ],
      warm: [
        { emoji: '👗', type: 'Outfit', description: 'Vestido o conjunto casual', detail: 'A tu gusto' },
        { emoji: '👟', type: 'Calzado', description: 'Zapatillas o botines', detail: 'Con estilo' }
      ],
      mild: [
        { emoji: '👗', type: 'Base', description: 'Outfit casual-chic', detail: 'Jeans + blusa bonita o vestido con chaqueta' },
        { emoji: '🧥', type: 'Chaqueta', description: 'Chaqueta liviana o denim', detail: 'Complementa el look' },
        { emoji: '👢', type: 'Calzado', description: 'Botines o zapatillas urbanas', detail: 'Con actitud' }
      ],
      cool: [
        { emoji: '👗', type: 'Base', description: 'Outfit en capas con estilo', detail: 'Top + cardigan o sweater' },
        { emoji: '🧥', type: 'Chaqueta', description: 'Chaqueta de cuero o trench', detail: 'Negro, beige o camel' },
        { emoji: '👖', type: 'Parte inferior', description: 'Jeans o falda con medias', detail: 'Look de otoño' },
        { emoji: '👢', type: 'Calzado', description: 'Botines o botas', detail: 'Con estilo' }
      ],
      cold: [
        { emoji: '👗', type: 'Base', description: 'Capas elegantes', detail: 'Sweater + blusa' },
        { emoji: '🧥', type: 'Abrigo', description: 'Abrigo elegante', detail: 'Negro, camel o gris' },
        { emoji: '👖', type: 'Parte inferior', description: 'Jeans + medias térmicas', detail: 'Abrigado con estilo' },
        { emoji: '👢', type: 'Calzado', description: 'Botas altas o botines', detail: 'Abrigados y lindos' }
      ],
      freezing: [
        { emoji: '🧣', type: 'Base', description: 'Capas térmicas', detail: 'Base ajustada + sweater grueso' },
        { emoji: '🧥', type: 'Abrigo', description: 'Abrigo largo y abrigado', detail: 'Con bufanda como accesorio' },
        { emoji: '👖', type: 'Parte inferior', description: 'Pantalón grueso', detail: 'Con calzas térmicas debajo' },
        { emoji: '🥾', type: 'Calzado', description: 'Botas impermeables', detail: 'Abrigadas' }
      ]
    }
  },

  // ── ESPECIAL (Elegante) ──
  especial: {
    masculino: {
      'extreme-hot': [
        { emoji: '👔', type: 'Camisa', description: 'Camisa elegante manga corta o lino', detail: 'Blanco, celeste o colores claros' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de tela elegante', detail: 'Beige o gris claro' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos elegantes', detail: 'Mocasines o zapatos de cuero' }
      ],
      hot: [
        { emoji: '👔', type: 'Camisa', description: 'Camisa elegante', detail: 'Colores claros, tela fresca' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de vestir', detail: 'Gris o azul marino' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos elegantes de cuero', detail: 'Marrón o negro' }
      ],
      warm: [
        { emoji: '👔', type: 'Camisa', description: 'Camisa de vestir', detail: 'Blanco o celeste' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de vestir', detail: 'Gris oscuro o azul marino' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos de cuero', detail: 'Negro pulido' }
      ],
      mild: [
        { emoji: '👔', type: 'Camisa', description: 'Camisa de vestir', detail: 'Blanco o tonos sobrios' },
        { emoji: '🧥', type: 'Blazer', description: 'Blazer elegante', detail: 'Azul marino, negro o gris' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de vestir', detail: 'A juego con blazer' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos de vestir', detail: 'Negro pulido' }
      ],
      cool: [
        { emoji: '👔', type: 'Camisa', description: 'Camisa de vestir', detail: 'Blanco' },
        { emoji: '🧥', type: 'Traje', description: 'Traje completo o blazer', detail: 'Azul marino, negro o gris oscuro' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón a juego', detail: 'Coordinado' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos de vestir', detail: 'Negro o marrón oscuro' }
      ],
      cold: [
        { emoji: '👔', type: 'Camisa', description: 'Camisa de vestir + corbata', detail: 'Elegancia completa' },
        { emoji: '🧥', type: 'Traje', description: 'Traje + abrigo elegante', detail: 'Abrigo largo sobre traje' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de traje', detail: 'A juego' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos de vestir', detail: 'Negro, bien pulidos' }
      ],
      freezing: [
        { emoji: '👔', type: 'Camisa', description: 'Camisa + chaleco de vestir', detail: 'Capas elegantes' },
        { emoji: '🧥', type: 'Abrigo', description: 'Abrigo largo elegante', detail: 'Negro o gris oscuro, de lana' },
        { emoji: '🧣', type: 'Bufanda', description: 'Bufanda elegante', detail: 'Sobria, de lana fina' },
        { emoji: '👖', type: 'Pantalón', description: 'Pantalón de traje grueso', detail: 'Con capa térmica interior' },
        { emoji: '👞', type: 'Calzado', description: 'Zapatos o botines elegantes', detail: 'Negro, abrigados' }
      ]
    },
    femenino: {
      'extreme-hot': [
        { emoji: '👗', type: 'Vestido', description: 'Vestido elegante y fresco', detail: 'Tela ligera, colores claros o un estampado elegante' },
        { emoji: '👠', type: 'Calzado', description: 'Sandalias elegantes o tacones', detail: 'Dorado, plateado o nude' }
      ],
      hot: [
        { emoji: '👗', type: 'Vestido', description: 'Vestido de cóctel o conjunto elegante', detail: 'Tela fresca pero elegante' },
        { emoji: '👠', type: 'Calzado', description: 'Tacones o sandalias de vestir', detail: 'A tono con el outfit' }
      ],
      warm: [
        { emoji: '👗', type: 'Vestido', description: 'Vestido de evento o conjunto', detail: 'Según la ocasión' },
        { emoji: '👠', type: 'Calzado', description: 'Tacones o zapatos elegantes', detail: 'Coordinados' }
      ],
      mild: [
        { emoji: '👗', type: 'Vestido', description: 'Vestido elegante o traje sastre', detail: 'Con chal o blazer liviano' },
        { emoji: '👠', type: 'Calzado', description: 'Zapatos cerrados elegantes', detail: 'Negro o del color del outfit' }
      ],
      cool: [
        { emoji: '👗', type: 'Outfit', description: 'Vestido con mangas o traje', detail: 'Elegante y abrigado' },
        { emoji: '🧥', type: 'Capa', description: 'Chal elegante o blazer', detail: 'Coordinado con el look' },
        { emoji: '👢', type: 'Calzado', description: 'Botines elegantes o tacones cerrados', detail: 'Negros o a tono' }
      ],
      cold: [
        { emoji: '👗', type: 'Outfit', description: 'Vestido de manga larga o conjunto', detail: 'Tela gruesa elegante' },
        { emoji: '🧥', type: 'Abrigo', description: 'Abrigo elegante', detail: 'Negro, rojo o camel' },
        { emoji: '👢', type: 'Calzado', description: 'Botas elegantes', detail: 'Con tacón o plataforma' }
      ],
      freezing: [
        { emoji: '👗', type: 'Outfit', description: 'Conjunto elegante con capas', detail: 'Vestido + medias gruesas o traje de lana' },
        { emoji: '🧥', type: 'Abrigo', description: 'Abrigo largo de lana', detail: 'Negro o en color elegante' },
        { emoji: '🧣', type: 'Accesorio', description: 'Pashmina o estola elegante', detail: 'Complemento de gala' },
        { emoji: '👢', type: 'Calzado', description: 'Botas elegantes abrigadas', detail: 'Tacón cómodo' }
      ]
    }
  }
};

// ════════════════════════════════════════
// Build Functions
// ════════════════════════════════════════

function buildOutfit(tempCategory, occasion, gender, conditions) {
  // Use 'neutro' → fallback to 'masculino' outfits with neutral labels
  const effectiveGender = gender === 'neutro' ? 'masculino' : gender;
  const occasionData = OUTFITS[occasion] ?? OUTFITS.estudio;
  const genderData = occasionData[effectiveGender] ?? occasionData.masculino;
  let outfit = genderData[tempCategory] ?? genderData.mild;

  // Deep copy to avoid mutating the database
  outfit = outfit.map(item => ({ ...item }));

  // If neutro, make labels gender-neutral
  if (gender === 'neutro') {
    outfit = outfit.map(item => ({
      ...item,
      description: item.description
        .replace(/Camisa de vestir/g, 'Camisa de vestir o blusa')
        .replace(/^Polera /g, 'Polera ')
    }));
  }

  // Rain modifier: swap to waterproof footwear
  if (conditions.hasRain) {
    outfit = outfit.map(item => {
      if (item.type === 'Calzado' || item.type.toLowerCase().includes('calzado')) {
        return {
          ...item,
          description: item.description + ' (resistentes al agua)',
          detail: 'Evita gamuza o tela — prefiere cuero o sintético'
        };
      }
      return item;
    });
  }

  return outfit;
}

function buildAccessories(conditions, occasion) {
  const accessories = [];

  // ── Rain ──
  if (conditions.hasRain) {
    accessories.push({
      emoji: '☂️',
      type: 'Paraguas',
      description: conditions.hasHeavyRain ? 'Paraguas grande imprescindible' : 'Lleva un paraguas por si acaso',
      detail: `${conditions.maxPrecipProb}% prob. de lluvia`
    });
  }

  // ── UV Protection ──
  if (conditions.maxUV >= 3) {
    accessories.push({
      emoji: '🕶️',
      type: 'Lentes de sol',
      description: conditions.maxUV >= 8 ? 'Lentes de sol con protección UV alta' : 'Lentes de sol',
      detail: `UV: ${conditions.maxUV} (${conditions.maxUV >= 8 ? 'Muy alto' : conditions.maxUV >= 6 ? 'Alto' : 'Moderado'})`
    });
  }

  if (conditions.maxUV >= 6) {
    accessories.push({
      emoji: '🧴',
      type: 'Protector solar',
      description: conditions.maxUV >= 8 ? 'Protector solar SPF 50+ obligatorio' : 'Protector solar SPF 30+',
      detail: 'Aplicar 15 min antes de salir'
    });
  }

  if (conditions.maxUV >= 8 && occasion !== 'especial') {
    accessories.push({
      emoji: '🧢',
      type: 'Gorro/Sombrero',
      description: 'Gorro o jockey para proteger del sol',
      detail: 'UV extremo, protege tu cabeza'
    });
  }

  // ── Cold accessories ──
  if (conditions.feelsMin < 8) {
    accessories.push({
      emoji: '🧣',
      type: 'Bufanda',
      description: 'Bufanda para proteger el cuello',
      detail: 'De lana o polar'
    });
  }

  if (conditions.feelsMin < 5) {
    accessories.push({
      emoji: '🧤',
      type: 'Guantes',
      description: 'Guantes para las manos',
      detail: 'Térmicos o de lana'
    });
    accessories.push({
      emoji: '🎩',
      type: 'Gorro de invierno',
      description: 'Gorro de lana',
      detail: 'Protege orejas y cabeza del frío'
    });
  }

  // ── Wind ──
  if (conditions.hasStrongWind && !accessories.some(a => a.type === 'Bufanda')) {
    accessories.push({
      emoji: '💨',
      type: 'Cortaviento',
      description: 'Considera una capa cortaviento',
      detail: `Viento hasta ${conditions.maxWind} km/h`
    });
  }

  return accessories;
}

function buildTips(conditions, occasion) {
  const tips = [];

  // Thermal amplitude
  if (conditions.thermalAmplitude >= 10) {
    tips.push(`🌡️ Gran cambio de temperatura hoy (${conditions.tempMin}° a ${conditions.tempMax}°). Usa sistema de capas para ir quitando o poniendo ropa.`);
  }

  // Night hours
  if (conditions.hasNightHours && conditions.feelsMin < conditions.feelsMax - 5) {
    tips.push(`🌙 Incluyes horas nocturnas en tu salida. Llevará a ${conditions.feelsMin}° de sensación, lleva una capa extra.`);
  }

  // UV Warning for Chile
  if (conditions.maxUV >= 11) {
    tips.push('⚠️ UV extremo. Evita exposición directa al sol entre 11:00 y 16:00 si es posible.');
  } else if (conditions.maxUV >= 8) {
    tips.push('☀️ UV muy alto. Busca sombra y reaplica protector solar cada 2 horas.');
  }

  // Rain tips
  if (conditions.hasHeavyRain) {
    tips.push('🌧️ Lluvia fuerte esperada. Evita ropa de colores claros que se transparente. Prefiere capas impermeables.');
  } else if (conditions.hasRain) {
    tips.push('🌦️ Posible lluvia. Ten un paraguas a mano y evita zapatos de tela o gamuza.');
  }

  // Wind
  if (conditions.hasStrongWind) {
    tips.push(`💨 Viento fuerte (hasta ${conditions.maxWind} km/h). Evita prendas muy sueltas, sombreros sin sujeción o faldas ligeras.`);
  }

  // Snow
  if (conditions.hasSnow) {
    tips.push('❄️ Posible nieve. Usa calzado antideslizante e impermeable. Abriga extremidades.');
  }

  // Fog
  if (conditions.hasFog) {
    tips.push('🌫️ Neblina esperada. Si manejas, usa luces bajas. La ropa puede humedecerse.');
  }

  // Thunderstorm
  if (conditions.hasThunderstorm) {
    tips.push('⛈️ Tormenta eléctrica esperada. Evita zonas abiertas y paraguas metálicos si es posible.');
  }

  // Humidity
  if (conditions.avgHumidity > 80 && conditions.feelsMax > 25) {
    tips.push('💧 Alta humedad con calor. Prefiere telas que respiren como algodón o lino. Evita sintéticos.');
  }

  // Occasion-specific
  if (occasion === 'trabajo' && conditions.thermalAmplitude >= 8) {
    tips.push('💼 Tip oficina: Deja una chaqueta en tu lugar de trabajo para los cambios de temperatura.');
  }

  if (occasion === 'especial' && conditions.hasRain) {
    tips.push('✨ Tip evento: Lleva los zapatos elegantes en una bolsa y usa calzado cómodo para el traslado.');
  }

  return tips;
}

function buildSummary(conditions) {
  let summary = '';

  if (conditions.feelsMin > 25) {
    summary = 'Día caluroso';
  } else if (conditions.feelsMin > 15) {
    summary = 'Temperatura agradable';
  } else if (conditions.feelsMin > 5) {
    summary = 'Día fresco';
  } else {
    summary = 'Mucho frío';
  }

  if (conditions.thermalAmplitude >= 10) {
    summary += ' con gran variación térmica';
  }

  if (conditions.hasRain) {
    summary += conditions.hasHeavyRain ? ' y lluvia fuerte' : ' y posible lluvia';
  }

  if (conditions.hasStrongWind) {
    summary += ' con viento fuerte';
  }

  return summary;
}

function getDefaultRecommendation() {
  return {
    outfit: [
      { emoji: '👕', type: 'Polera', description: 'Polera cómoda', detail: 'A tu gusto' },
      { emoji: '👖', type: 'Pantalón', description: 'Jeans o pantalón cómodo', detail: 'Versátil' },
      { emoji: '👟', type: 'Calzado', description: 'Zapatillas', detail: 'Cómodas' }
    ],
    accessories: [],
    tips: ['No hay datos meteorológicos disponibles. Esta es una recomendación genérica.'],
    summary: 'Sin datos de clima disponibles',
    conditions: null
  };
}

