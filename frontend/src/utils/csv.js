export function parseCsv(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = normalized[i + 1];
        if (next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(current);
      current = '';
      continue;
    }

    if (ch === '\n') {
      row.push(current);
      current = '';
      const isBlank = row.every((cell) => String(cell || '').trim() === '');
      if (!isBlank) rows.push(row);
      row = [];
      continue;
    }

    current += ch;
  }

  row.push(current);
  if (!row.every((cell) => String(cell || '').trim() === '')) rows.push(row);

  if (!rows.length) return { headers: [], records: [] };

  const headers = rows[0].map((value) => String(value || '').trim());
  const dataRows = rows.slice(1);
  const records = dataRows.map((cells) => {
    const record = {};
    headers.forEach((key, idx) => {
      if (!key) return;
      record[key] = cells[idx] == null ? '' : String(cells[idx]).trim();
    });
    return record;
  });

  return { headers, records };
}

