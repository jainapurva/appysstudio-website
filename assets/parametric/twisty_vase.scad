// Twisty Vase / Planter — Appy's Studio parametric generator
//
// A lobed profile swept upward with a twist. Every value below is overridden
// per request with -D, so these are the defaults, not the range; the allowed
// range lives in lib/parametric/models.ts.
//
// Rendered with --backend=manifold (see render.worker.mjs). On the old CGAL
// backend this same file takes 39 seconds; on Manifold it takes 0.4.

diameter = 90;        // across the base, mm
height = 140;
lobes = 6;            // how many ridges run up the side
twist = 180;          // degrees of rotation over the full height
taper = 105;          // top width as a percentage of the base
depth = 14;           // how far the lobes stand out, percent of radius
wall = 2.4;
base_thickness = 3.2;
drain = false;        // drainage hole, for a planter

// Sampling around the profile. 160 keeps the lobes smooth without making the
// mesh needlessly heavy — the ridges are the only high-curvature feature.
steps = 160;

// Twist is what forces slices; too few and the ridges look faceted, too many
// and the mesh balloons. One slice per 4 degrees, with a floor for a straight vase.
slices = max(24, ceil(abs(twist) / 4));

$fn = 64;

radius = diameter / 2;

// --- why this is built the way it is ---------------------------------------
// The obvious construction — sweep a solid, sweep a smaller solid, subtract —
// produces a vase that does not hold water once it twists. Sweeping two
// surfaces independently lets them cross: linear_extrude joins slices with flat
// ruled facets, and at the lobe valleys the inner surface meets the outer one
// and pinches the wall shut. The cross-section becomes `lobes` separate petals
// instead of one ring. It is still a closed, printable, perfectly valid solid,
// so nothing downstream flags it.
//
// Extruding the 2D *annulus* instead makes that failure unrepresentable. A
// region with a hole in it extrudes to a solid with that hole all the way up,
// whatever the twist does — there is no second surface to cross. Where the
// valleys curve tighter than the wall, offset() erodes them and the wall simply
// gets thicker there, which is safe.
//
// Depth is still clamped below, not for correctness now but so the cavity stays
// a cavity: past this point the lobes eat it and you get a solid lump of PLA.
// For r(t) = R + a*cos(n*t) the valley radius of curvature is
//     rho = (R-a)^2 / (a*n^2 - (R-a))
// and the bound is the `a` that leaves rho >= wall.

wanted_amplitude = radius * depth / 100;

margin = 1.15;                       // a little headroom over the exact limit
w = wall * margin;
nn = lobes * lobes;
u_min = (-w * (1 + nn) + sqrt(w * w * (1 + nn) * (1 + nn) + 4 * w * nn * radius)) / 2;
max_amplitude = max(0, radius - u_min);

amplitude = min(wanted_amplitude, max_amplitude);

// --- profile ---------------------------------------------------------------

module lobed() {
    polygon([
        for (i = [0 : steps - 1])
            let(angle = i * 360 / steps,
                r = radius + amplitude * cos(lobes * angle))
                [r * cos(angle), r * sin(angle)]
    ]);
}

// The ring of material, as a single 2D region.
module wall_ring() {
    difference() {
        lobed();
        offset(r = -wall) lobed();
    }
}

// The base is its own extrude, stopping short of the full height. Twist and
// taper interpolate linearly over the height, so taking the same fraction of
// each makes its top face meet the wall exactly.
base_fraction = min(1, base_thickness / height);

difference() {
    union() {
        linear_extrude(height = height, twist = twist, scale = taper / 100, slices = slices)
            wall_ring();

        linear_extrude(height = base_thickness,
                       twist = twist * base_fraction,
                       scale = 1 + (taper / 100 - 1) * base_fraction,
                       slices = max(2, ceil(slices * base_fraction)))
            lobed();
    }

    if (drain)
        translate([0, 0, -1])
            cylinder(d = 8, h = base_thickness + 2);
}
