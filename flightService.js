function generateMockPrice(destination, departure) {
  // random alapár 20 000 - 80 000 Ft között
  const basePrice = Math.floor(Math.random() * 60000) + 20000;

  // kicsi eltérés dátum alapján (hogy ne teljesen random legyen)
  const modifier = departure.charCodeAt(0) % 5000;

  return basePrice + modifier;
}

async function searchMockFlights(destination, departure, returnDate) {
  // 20% eséllyel hibázik
  if (Math.random() < 0.2) {
    throw new Error("Mock API hiba");
  }
  const price = generateMockPrice(destination, departure);

  return {
    destination,
    departure,
    return: returnDate,
    price
  };
}

module.exports = {
  searchMockFlights,
  generateMockPrice
};