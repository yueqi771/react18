function getLowestPriorityLane(lanes) {
  const index = 31 - Math.clz32(lanes);

  return 1 << index;
}