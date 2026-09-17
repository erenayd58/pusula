import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** GET filtre formu (sunucu bileşeni): tarih aralığı + ders; URL arama parametrelerine yazar. */
export function QuestionLogFilters({
  from,
  to,
  subjectId,
  subjects,
}: {
  from: string;
  to: string;
  subjectId: string | null;
  subjects: { subjectId: string; name: string }[];
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="from">Başlangıç</Label>
        <Input id="from" name="from" type="date" defaultValue={from} max={to} />
      </div>
      <div>
        <Label htmlFor="to">Bitiş</Label>
        <Input id="to" name="to" type="date" defaultValue={to} />
      </div>
      <div className="min-w-44">
        <Label htmlFor="subject">Ders</Label>
        <NativeSelect id="subject" name="subject" defaultValue={subjectId ?? ""}>
          <option value="">Tüm dersler</option>
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" variant="secondary">
        Filtrele
      </Button>
    </form>
  );
}
