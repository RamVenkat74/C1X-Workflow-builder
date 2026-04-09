export function getManhattanPath(source, target) {
    const midY = source.y + (target.y - source.y) / 2;
    // Calculates optimal non-intersecting paths using orthogonal 90-degree bends 
    return `M ${source.x} ${source.y} 
          L ${source.x} ${midY} 
          L ${target.x} ${midY} 
          L ${target.x} ${target.y}`;
}
