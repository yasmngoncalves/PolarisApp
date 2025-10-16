export const dailyTasks = [
  { id: 'mood', title: 'Registre seu humor', description: 'Como você está se sentindo hoje?' },
  { id: 'sleep', title: 'Registre seu sono', description: 'Acompanhe a qualidade e duração do seu sono.' },
  { id: 'medication', title: 'Registre sua medicação', description: 'Você tomou sua medicação?' },
];

export const journalData: { [key: string]: any } = {
  '2024-07-15': {
    mood: { mood: 'Feliz', intensity: 8, notes: 'Me senti ótimo depois de uma caminhada matinal.' },
    sleep: { duration: '8h 15m', quality: 'Bom' },
    medication: [{ name: 'Vitamina D', dosage: '1000 IU' }],
    water: 2500,
  },
  '2024-07-16': {
    mood: { mood: 'Cansado', intensity: 4, notes: 'Longo dia de trabalho.' },
    sleep: { duration: '6h 30m', quality: 'Razoável' },
    medication: [{ name: 'Vitamina D', dosage: '1000 IU' }],
    water: 1500,
  },
  '2024-07-17': {
    mood: { mood: 'Calmo', intensity: 7, notes: 'Tarde tranquila lendo um livro.' },
    sleep: { duration: '7h 45m', quality: 'Bom' },
    medication: [],
    water: 2250,
  },
};

export const moodChartData = [
    { date: 'Jul 15', mood: 8, average: 6 },
    { date: 'Jul 16', mood: 4, average: 6 },
    { date: 'Jul 17', mood: 7, average: 6 },
    { date: 'Jul 18', mood: 6, average: 6.5 },
    { date: 'Jul 19', mood: 9, average: 7 },
    { date: 'Jul 20', mood: 5, average: 6.8 },
    { date: 'Jul 21', mood: 7, average: 6.9 },
];

export const sleepChartData = [
    { date: 'Jul 15', duration: 8.25, quality: 4 },
    { date: 'Jul 16', duration: 6.5, quality: 2 },
    { date: 'Jul 17', duration: 7.75, quality: 4 },
    { date: 'Jul 18', duration: 7, quality: 3 },
    { date: 'Jul 19', duration: 8.5, quality: 5 },
    { date: 'Jul 20', duration: 6, quality: 2 },
    { date: 'Jul 21', duration: 7.5, quality: 4 },
];

export const waterChartData = [
    { date: 'Jul 15', intake: 2500, goal: 2000 },
    { date: 'Jul 16', intake: 1500, goal: 2000 },
    { date: 'Jul 17', intake: 2250, goal: 2000 },
    { date: 'Jul 18', intake: 1750, goal: 2000 },
    { date: 'Jul 19', intake: 3000, goal: 2000 },
    { date: 'Jul 20', intake: 1250, goal: 2000 },
    { date: 'Jul 21', intake: 2000, goal: 2000 },
];
