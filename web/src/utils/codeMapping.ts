// utils/codeMapping.ts
export const codeToTextMapping: Record<string, string> = {
  '1994': 'AB Našice',
  '21102': 'Šire NA područje',
  '21075': 'AB Našice skladište rasutog mat.',
  '22039': 'Rekon. nasipa Batina',
  '22065': '1. Gimnazija OS',
  '23006': 'Most preko rijeke Vučice',
  '23010': 'Podvožnjak na DC 517, BM',
  '23018': 'Rek. - Baćin Dol - Rešetari',
  '23020': 'Log Expert L. - Park Osijek',
  '23022': 'Gundulićeva Ulica',
  '23023': 'Sljemenska, Kolodvorska i Kapelska Ulica',
  '23032': 'Reg. d.o.r. Dunav - Urbanističko uređenje grada VU',
  '23050': 'Koridor Vc',
  '23053': 'Rekon. raskrižja u k.t - Oprisavci',
  '23054': 'Građenje dionice LC42042 prema Surevici',
  '23071': 'Izvanredno održavanje ceste Belišće',
  '23075': 'Retail Park Retfala Nova',
  '24001': 'Izgradnja propusta Nemetin',
  '24005': 'Rest. toka Dunava - Zmajevički Dunavac',
  '24008': 'Prist. cesta i most Vuka',
  '24010': 'Obilaznica Vukovar',
  '24030': 'Radovi Na. Brez. i Ordanja',
  '24042': 'HEY PARK VK',
  '24044': 'Našice - Dom za starije',
  '24050': 'Rek. kan. mreže Nemetin',
  '24051': 'Građ. obrt. radovi - tvor cem. Našice',
  '24058': 'Dom za starije Vrpolje',
  '24065': 'REKON. DC ERDUT - GP DALJ',
  '24076': 'Dom za starije SB',
  '25006': 'Ricardo',
  '25009': 'Ladimirevci',
  '25013': 'Ricardo',
  '25014': 'Baras',
  '25016': 'Bizovac',
  '25023': 'Novokomerc',
  '25025': 'Autopraonica Belišće',
  '25030': 'Rekon. ceste Ul.M.Gubca - Belišće',
  '25032': 'Pripremni radovi - NCI prostora Čepin',
  '25033': 'PS Beli Manastir',
  '25034': 'PS Đakovo',
  '5014': 'Betonara',
};

/**
 * Get formatted code with description
 * @param code - The code number as string
 * @returns Formatted string with code and description
 */
export const getFormattedCode = (code: string): string => {
  const description = codeToTextMapping[code];
  return description ? `${code} - ${description}` : `${code} - /`;
};

/**
 * Get just the description for a code
 * @param code - The code number as string
 * @returns Description or "/" if not found
 */
export const getCodeDescription = (code: string): string => {
  return codeToTextMapping[code] || '/';
};
