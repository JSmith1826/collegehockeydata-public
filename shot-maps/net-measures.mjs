// Finish coordinates use their own located goals+saves denominator. Origin
// coverage must never change the meaning of a net-placement share.
export function netZoneValue(sample, index, measure, games, baseline) {
  if (!sample.points.length) return null;
  const count = sample.bins[index].sog;
  if (measure === 'pergame') return games > 0 ? count / games : null;
  const share = 100 * count / sample.points.length;
  if (measure !== 'difference') return share;
  return baseline?.points.length ? share - 100 * baseline.bins[index].sog / baseline.points.length : null;
}

export function netGrid(sample, games, measure = 'pergame', baseline = null) {
  const width = 72, height = 48;
  const smooth = (points, denominator) => {
    const values = new Float32Array(width * height);
    if (!(denominator > 0)) return values;
    for (const p of points) {
      const px = p[8] * width / 100, py = p[9] * height / 100;
      for (let y = Math.max(0, Math.floor(py - 10)); y < Math.min(height, py + 11); y++)
        for (let x = Math.max(0, Math.floor(px - 10)); x < Math.min(width, px + 11); x++)
          values[y * width + x] += Math.exp(-((x - px) ** 2 + (y - py) ** 2) / 24) / denominator;
    }
    return values;
  };
  const available = sample.points.length > 0 && (measure !== 'difference' || baseline?.points.length > 0);
  const values = smooth(available ? sample.points : [], measure === 'pergame' ? games : sample.points.length);
  if (measure === 'difference' && available) {
    const reference = smooth(baseline.points, baseline.points.length);
    values.forEach((v, i) => { values[i] = v - reference[i]; });
  }
  return {width, height, values, available, max: Math.max(0, ...values.map(Math.abs))};
}
