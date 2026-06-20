import type { Drivetrain } from '@/types/supabase';

const DRIVETRAIN_COLORS: Record<Drivetrain, string> = {
  AWD: "bg-blue-500/20 border-blue-500/50 text-blue-400",
  RWD: "bg-orange-500/20 border-orange-500/50 text-orange-400",
  FWD: "bg-green-500/20 border-green-500/50 text-green-400",
};

// Couleurs pleines pour les boutons de filtre transmission actifs
export const DRIVETRAIN_FILTER_COLORS: Record<"Tous" | Drivetrain, string> = {
  Tous: "bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white",
  AWD:  "bg-blue-500 text-white border-blue-500",
  RWD:  "bg-orange-500 text-white border-orange-500",
  FWD:  "bg-green-500 text-white border-green-500",
};

export function DrivetrainBadge({ drivetrain }: { drivetrain: Drivetrain | null }) {
  const style = drivetrain
    ? DRIVETRAIN_COLORS[drivetrain]
    : "bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400";
  return (
    // `br-dt` + `data-dt` : cibles stables pour les signatures de skin (Arcade =
    // badges pleins, cf. globals.css). Sans effet en skin Classic.
    <span data-dt={drivetrain ?? "none"} className={`br-dt px-2 py-0.5 border rounded text-xs font-bold ${style}`}>
      {drivetrain ?? "—"}
    </span>
  );
}
