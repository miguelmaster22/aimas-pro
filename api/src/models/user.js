module.exports = {
  _id: String, // Unique identifier
  wallet: String, // User's wallet address
  registered: Boolean, // Registration status
  invested: String, // Total invested amount
  invested_leader: String, // Leader investment amount
  upTo: String, // Maximum earnings potential
  lastUpdate: Number, // Last update timestamp
  reclamados: String, // Total claimed points
  referer: String, // Referrer wallet
  up: String, // Upline wallet
  left: String, // Left downline wallet
  lReclamados: String, // Left claimed points
  lExtra: String, // Left extra points
  lPersonas: String, // Left downline count
  lPuntos: String, // Left total points
  right: String, // Right downline wallet
  rReclamados: String, // Right claimed points
  rExtra: String, // Right extra points
  rPersonas: String, // Right downline count
  rPuntos: String, // Right total points
  idBlock: Number, // Block ID
  idBlock_old: Number, // Old block ID
  puntosActivos: String, // Active points
  hand: Number, // Hand position (0=left, 1=right)
  retirableA: Number // Withdrawable amount
}