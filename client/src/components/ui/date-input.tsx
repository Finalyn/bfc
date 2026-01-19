import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = [
  { value: "01", label: "janv." },
  { value: "02", label: "févr." },
  { value: "03", label: "mars" },
  { value: "04", label: "avr." },
  { value: "05", label: "mai" },
  { value: "06", label: "juin" },
  { value: "07", label: "juil." },
  { value: "08", label: "août" },
  { value: "09", label: "sept." },
  { value: "10", label: "oct." },
  { value: "11", label: "nov." },
  { value: "12", label: "déc." },
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => String(CURRENT_YEAR + i));

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  testId?: string;
}

export function DateInput({ value, onChange, testId }: DateInputProps) {
  const parts = value ? value.split("-") : ["", "", ""];
  const year = parts[0] || "";
  const month = parts[1] || "";
  const day = parts[2] || "";

  const updateDate = (d: string, m: string, y: string) => {
    if (d && m && y) {
      onChange(`${y}-${m}-${d}`);
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <Select value={day} onValueChange={(d) => updateDate(d, month, year)}>
        <SelectTrigger className="w-20 h-12">
          <SelectValue placeholder="Jour" />
        </SelectTrigger>
        <SelectContent>
          {DAYS.map((d) => (
            <SelectItem key={d} value={d}>{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month} onValueChange={(m) => updateDate(day, m, year)}>
        <SelectTrigger className="w-24 h-12">
          <SelectValue placeholder="Mois" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={year} onValueChange={(y) => updateDate(day, month, y)}>
        <SelectTrigger className="w-24 h-12">
          <SelectValue placeholder="Année" />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
