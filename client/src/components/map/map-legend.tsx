export function MapLegend() {
  return (
    <div className="absolute bottom-6 left-6 bg-card p-4 rounded-lg shadow-lg border border-border z-20 hidden md:block">
      <h4 className="text-sm font-medium text-foreground mb-3">Legend</h4>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Crashes</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Hazards</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Restrictions</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Cameras</span>
        </div>
      </div>
    </div>
  );
}
