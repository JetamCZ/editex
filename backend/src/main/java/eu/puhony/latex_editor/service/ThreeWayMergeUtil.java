package eu.puhony.latex_editor.service;

import com.github.difflib.DiffUtils;
import com.github.difflib.patch.AbstractDelta;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Line-based 3-way merge utility.
 *
 * <p>Given a common ancestor ({@code base}) and two diverged versions ({@code ours} = target
 * branch, {@code theirs} = source branch being merged in), produces a merged result.
 * Regions changed by only one side are applied automatically; regions changed differently
 * by both sides are wrapped in standard conflict markers.</p>
 */
public class ThreeWayMergeUtil {

    public record MergeResult(String content, int conflictCount) {
        public boolean hasConflicts() { return conflictCount > 0; }
    }

    /**
     * @param base        common ancestor content
     * @param ours        target branch current content  (will be labelled in conflict header)
     * @param theirs      source branch current content  (will be labelled in conflict footer)
     * @param oursLabel   branch name for {@code <<<<<<< oursLabel}
     * @param theirsLabel branch name for {@code >>>>>>> theirsLabel}
     */
    public static MergeResult merge(String base, String ours, String theirs,
                                    String oursLabel, String theirsLabel) {
        List<String> baseLines  = splitLines(base);
        List<String> ourLines   = splitLines(ours);
        List<String> theirLines = splitLines(theirs);

        List<AbstractDelta<String>> ourDeltas   = DiffUtils.diff(baseLines, ourLines).getDeltas();
        List<AbstractDelta<String>> theirDeltas = DiffUtils.diff(baseLines, theirLines).getDeltas();

        List<String> result = new ArrayList<>();
        int conflicts = 0;
        int basePos = 0;
        int oi = 0, ti = 0;

        while (basePos < baseLines.size() || oi < ourDeltas.size() || ti < theirDeltas.size()) {
            int ourNext   = oi < ourDeltas.size()   ? ourDeltas.get(oi).getSource().getPosition()   : Integer.MAX_VALUE;
            int theirNext = ti < theirDeltas.size() ? theirDeltas.get(ti).getSource().getPosition() : Integer.MAX_VALUE;
            int next = Math.min(Math.min(ourNext, theirNext), baseLines.size());

            // Copy unchanged base lines up to the next change region
            while (basePos < next) result.add(baseLines.get(basePos++));

            if (oi >= ourDeltas.size() && ti >= theirDeltas.size()) break;

            // Collect all overlapping / adjacent deltas into one conflict region so that
            // interleaved edits are not silently merged into an inconsistent result.
            List<AbstractDelta<String>> oursInRegion   = new ArrayList<>();
            List<AbstractDelta<String>> theirsInRegion = new ArrayList<>();
            int regionEnd = basePos;

            boolean extended = true;
            while (extended) {
                extended = false;
                while (oi < ourDeltas.size()) {
                    AbstractDelta<String> d = ourDeltas.get(oi);
                    int dStart = d.getSource().getPosition();
                    int dEnd   = dStart + d.getSource().size();
                    if (dStart <= regionEnd) {
                        oursInRegion.add(d); oi++;
                        if (dEnd > regionEnd) { regionEnd = dEnd; extended = true; }
                    } else break;
                }
                while (ti < theirDeltas.size()) {
                    AbstractDelta<String> d = theirDeltas.get(ti);
                    int dStart = d.getSource().getPosition();
                    int dEnd   = dStart + d.getSource().size();
                    if (dStart <= regionEnd) {
                        theirsInRegion.add(d); ti++;
                        if (dEnd > regionEnd) { regionEnd = dEnd; extended = true; }
                    } else break;
                }
            }

            if (oursInRegion.isEmpty() && theirsInRegion.isEmpty()) break; // safety guard

            List<String> ourVersion   = applyDeltasToRange(baseLines, oursInRegion,   basePos, regionEnd);
            List<String> theirVersion = applyDeltasToRange(baseLines, theirsInRegion, basePos, regionEnd);

            if (ourVersion.equals(theirVersion)) {
                // Both sides made the exact same change — apply once, no conflict
                result.addAll(ourVersion);
            } else if (oursInRegion.isEmpty()) {
                // Only source (theirs) changed
                result.addAll(theirVersion);
            } else if (theirsInRegion.isEmpty()) {
                // Only target (ours) changed
                result.addAll(ourVersion);
            } else {
                // Both sides changed this region differently → conflict
                result.add("<<<<<<< " + oursLabel);
                result.addAll(ourVersion);
                result.add("=======");
                result.addAll(theirVersion);
                result.add(">>>>>>> " + theirsLabel);
                conflicts++;
            }

            basePos = regionEnd;
        }

        return new MergeResult(String.join("\n", result), conflicts);
    }

    /**
     * Reconstruct what {@code branch} looks like for base lines [{@code rangeStart}, {@code rangeEnd})
     * by replaying only the deltas that fall inside that range.
     */
    private static List<String> applyDeltasToRange(List<String> base,
                                                    List<AbstractDelta<String>> deltas,
                                                    int rangeStart, int rangeEnd) {
        List<String> out = new ArrayList<>();
        int pos = rangeStart;
        for (AbstractDelta<String> d : deltas) {
            int dStart = d.getSource().getPosition();
            while (pos < dStart) out.add(base.get(pos++));
            out.addAll(d.getTarget().getLines());
            pos += d.getSource().size();
        }
        while (pos < rangeEnd) out.add(base.get(pos++));
        return out;
    }

    private static List<String> splitLines(String text) {
        if (text == null || text.isEmpty()) return new ArrayList<>();
        String normalized = text.replace("\r\n", "\n").replace("\r", "\n");
        return new ArrayList<>(Arrays.asList(normalized.split("\n", -1)));
    }
}
