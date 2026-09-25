import { Badge } from "@/components/ui/badge";
import { isPricingUnset, type MaybePricingValue } from "@/config/pricing";

/**
 * Renders a pricing value from config. Unset values render an explicit "TBD"
 * badge carrying `data-config-key` pointing at the config path — never an
 * invented number (docs/design/marketing-site.md "Pricing configuration").
 */
export function ConfigValue({
  value,
  configKey,
  format,
  suffix,
  className,
}: {
  value: MaybePricingValue<number>;
  configKey: string;
  format?: (value: number) => string;
  suffix?: string;
  className?: string;
}) {
  if (isPricingUnset(value)) {
    return (
      <Badge color="secondary" variant="light" data-config-key={configKey} className={className}>
        TBD
      </Badge>
    );
  }
  const formatted = format ? format(value) : String(value);
  return <span className={className}>{suffix ? `${formatted}${suffix}` : formatted}</span>;
}
