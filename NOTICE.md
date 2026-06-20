# Notices & attributions

This package (`stadfangaskra`) is MIT-licensed (see `LICENSE`). It is an
independent TypeScript reimplementation, not a copy, but it stands on two
external sources that carry their own terms.

## 1. Bundled postcode data — from `iceaddr` (BSD-3-Clause)

`src/postcodes.ts` (the `POSTCODES` table: postcode → place name in nominative
and dative case, region, description, kind) is **ported from**
[`iceaddr`](https://github.com/sveinbjornt/iceaddr) by Sveinbjörn Þórðarson,
specifically `src/iceaddr/postcodes.py`. `iceaddr` is licensed BSD-3-Clause; the
nominative place-name declensions in that data were produced by `iceaddr` using
Miðeind's GreynirPackage. The original postcode list is provided by Postur.is.

This is the **only data bundled in this package**. Per the BSD-3-Clause terms,
its copyright notice is retained here:

```
BSD 3-Clause License

Copyright (c) 2018-2025, Sveinbjorn Thordarson
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## 2. Address registry data — fetched at runtime (CC-BY 4.0)

This package does **not** redistribute the Icelandic address registry
(Staðfangaskrá). `streamStadfangaskra()` / `loadStadfangaskra()` download it at
runtime from the public HMS (Húsnæðis- og mannvirkjastofnun) export. That data
is published by **HMS / Þjóðskrá Íslands** under **CC-BY 4.0**. If you use it in
a product, you owe the attribution:

> Staðfangaskrá by HMS / Þjóðskrá Íslands, CC-BY 4.0

## Acknowledgement

The whole approach — which columns to keep, the cleaning rules, the search and
validation semantics — follows the design of Sveinbjörn Þórðarson's `iceaddr`.
This package exists to make that available to TypeScript / edge runtimes; full
credit and thanks to him for the original work.

The `heinum` (address identifier, distinct from the coordinate-point `hnitnum`)
field follows iceaddr#16 by Jökull Sólberg.
