import type { RightsOut } from "../../lib/services";
import { TOPIC_LABELS } from "../../lib/services";
import { Badge, Card, List } from "../ui";
import { Footnote } from "./LetterResult";

const tone = { high: "green", medium: "amber", low: "red" } as const;

export function RightsResult({ data, txHash }: { data: RightsOut; txHash?: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-white">
            {TOPIC_LABELS[data.topic] ?? data.topic} in {data.state}
          </h4>
          <Badge tone={tone[data.confidence] ?? "gray"}>{data.confidence} confidence</Badge>
        </div>
        <p className="text-sm leading-relaxed text-slate-200">{data.summary}</p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h4 className="mb-2 text-sm font-semibold text-white">Key rules</h4>
          <List items={data.key_rules} />
        </Card>
        <Card>
          <h4 className="mb-2 text-sm font-semibold text-white">Common landlord violations</h4>
          <List items={data.common_landlord_violations} />
        </Card>
      </div>
      <Card>
        <h4 className="mb-2 text-sm font-semibold text-white">Where to get help</h4>
        <List items={data.where_to_get_help} />
      </Card>
      <Footnote disclaimer={data.disclaimer} txHash={txHash} />
    </div>
  );
}
