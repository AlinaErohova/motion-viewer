const path = require('node:path');
const { DotLottie, DotLottieBuilder } = require('@lottiefiles/dotlottie-io');

function safeBaseName(name) {
  return path.basename(name, path.extname(name)).replace(/[^a-zA-Z0-9._ -]+/g, '-').trim() || 'animation';
}

function animationId(name) {
  return safeBaseName(name).replace(/\s+/g, '_');
}

function parseJson(buffer, name) {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new Error(`${name} is not valid Lottie JSON.`);
  }
}

function assertLottie(data, name) {
  if (!data || !Number.isFinite(data.w) || !Number.isFinite(data.h) || !Array.isArray(data.layers)) {
    throw new Error(`${name} does not contain a valid Lottie composition.`);
  }
}

function resizeLottie(source, width, height) {
  const data = structuredClone(source);
  const sourceWidth = Number(data.w);
  const sourceHeight = Number(data.h);

  if (sourceWidth === width && sourceHeight === height) return data;

  const assets = Array.isArray(data.assets) ? data.assets : [];
  const usedIds = new Set(assets.map((asset) => asset && asset.id).filter(Boolean));
  let compositionId = '__motion_viewer_source';
  let suffix = 1;
  while (usedIds.has(compositionId)) compositionId = `__motion_viewer_source_${suffix++}`;

  const scale = Math.min(width / sourceWidth, height / sourceHeight) * 100;
  const sourceLayers = data.layers;

  data.w = width;
  data.h = height;
  data.assets = [...assets, {
    id: compositionId,
    w: sourceWidth,
    h: sourceHeight,
    layers: sourceLayers,
  }];
  data.layers = [{
    ddd: 0,
    ind: 1,
    ty: 0,
    nm: 'Motion Viewer resized composition',
    refId: compositionId,
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [width / 2, height / 2, 0] },
      a: { a: 0, k: [sourceWidth / 2, sourceHeight / 2, 0] },
      s: { a: 0, k: [scale, scale, 100] },
    },
    ao: 0,
    w: sourceWidth,
    h: sourceHeight,
    ip: Number(data.ip) || 0,
    op: Number(data.op) || 1,
    st: 0,
    bm: 0,
  }];

  return data;
}

function imageMime(filename) {
  switch (path.extname(filename).toLowerCase()) {
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.gif': return 'image/gif';
    default: return 'image/png';
  }
}

function inlineImages(data, archive) {
  if (!archive || !Array.isArray(data.assets)) return data;

  const filenames = archive.imageFilenames();
  for (const asset of data.assets) {
    if (!asset || typeof asset.p !== 'string' || asset.p.startsWith('data:')) continue;
    const filename = filenames.find((item) => item === asset.p || path.basename(item) === path.basename(asset.p));
    if (!filename) continue;
    const image = archive.getImage(filename);
    if (!image) continue;
    asset.p = `data:${imageMime(filename)};base64,${image.toString('base64')}`;
    asset.u = '';
    asset.e = 1;
  }
  return data;
}

function readAnimation(item) {
  const buffer = Buffer.from(item.data);
  if (item.name.toLowerCase().endsWith('.json')) {
    const data = parseJson(buffer, item.name);
    assertLottie(data, item.name);
    return { data, archive: null, animationId: null, original: buffer };
  }

  let archive;
  try {
    archive = DotLottie.fromBytes(buffer);
  } catch {
    throw new Error(`${item.name} is not a valid dotLottie file.`);
  }
  const id = archive.getInitialAnimationId() || archive.animationIds()[0];
  const json = id && archive.getAnimationJson(id);
  if (!id || !json) throw new Error(`${item.name} does not contain an animation.`);
  const data = parseJson(Buffer.from(json), item.name);
  assertLottie(data, item.name);
  return { data, archive, animationId: id, original: buffer };
}

function buildDotLottie(data, name) {
  const id = animationId(name);
  const builder = new DotLottieBuilder();
  builder.version('2');
  builder.generator('Motion Viewer 0.3.0');
  builder.addAnimation(id, JSON.stringify(data), { name: safeBaseName(name) });
  builder.initialAnimation(id);
  return builder.build().toBytes();
}

function convertAnimation(item, options) {
  const source = readAnimation(item);
  const custom = options.size === 'custom';
  const width = custom ? Number(options.width) : Number(source.data.w);
  const height = custom ? Number(options.height) : Number(source.data.h);

  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 16384 || height > 16384) {
    throw new Error('Export dimensions must be whole numbers between 1 and 16384 pixels.');
  }

  if (options.format === 'lottie' && !custom && source.archive) {
    return { name: `${safeBaseName(item.name)}.lottie`, data: source.original };
  }

  let data = inlineImages(structuredClone(source.data), source.archive);
  if (custom) data = resizeLottie(data, width, height);

  if (options.format === 'json') {
    return {
      name: `${safeBaseName(item.name)}.json`,
      data: Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8'),
    };
  }

  return {
    name: `${safeBaseName(item.name)}.lottie`,
    data: buildDotLottie(data, item.name),
  };
}

module.exports = { convertAnimation, resizeLottie };
