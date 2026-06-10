export function getPickUser(snakeOrder: string[], pickNumber: number): string {
  const teamCount = snakeOrder.length
  const pickIndex = pickNumber - 1
  const roundNumber = Math.floor(pickIndex / teamCount) + 1
  const positionInRound = pickIndex % teamCount

  return roundNumber % 2 === 1
    ? snakeOrder[positionInRound]
    : snakeOrder[teamCount - 1 - positionInRound]
}
