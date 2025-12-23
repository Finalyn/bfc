import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  testId?: string;
  maxDisplayed?: number;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  emptyText = "Aucun résultat trouvé",
  className,
  disabled = false,
  testId,
  maxDisplayed = 50,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedOption = options.find((option) => option.value === value);

  const normalizedOptions = React.useMemo(() => {
    return options.map(opt => ({
      ...opt,
      normalizedLabel: opt.label.toLowerCase()
    }));
  }, [options]);

  const { filteredOptions, hasMore } = React.useMemo(() => {
    if (!search || search.length < 1) {
      return { filteredOptions: [], hasMore: options.length > 0 };
    }
    const searchLower = search.toLowerCase();
    const matched = normalizedOptions.filter(opt => opt.normalizedLabel.includes(searchLower));
    return {
      filteredOptions: matched.slice(0, maxDisplayed),
      hasMore: matched.length > maxDisplayed
    };
  }, [normalizedOptions, search, maxDisplayed, options.length]);

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setSearch("");
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full h-12 justify-between text-base font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          data-testid={testId}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            className="h-12" 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!search && options.length > 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                Tapez pour rechercher parmi {options.length.toLocaleString()} éléments...
              </div>
            ) : filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onValueChange(option.value === value ? "" : option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
                {hasMore && (
                  <div className="px-2 py-2 text-xs text-muted-foreground text-center border-t">
                    Tapez pour affiner la recherche...
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
