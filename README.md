<h1 align=center>r2</h1>
<div align=center>modern generator based reactivity ⚙️</div>
<br />

### why?

Modern signals implementations in JavaScript are all implemented using push-pull-push and tri-coloring. However, this approach requires overeager marking of all recursive dependencies, making it impossible to make an `O(1)` implementation of `createSelector` or `createProjection` (which require marking only a subset of children based on the return value of a computation). 

This library implements a different approach to reactivity using topological execution (height ordering).

To allow for nodes to dynamically change sources (and therefore heights), we require the use of generators.

### see also

- [incremental](https://github.com/janestreet/incremental)
- [7 implementations of incremental](https://www.youtube.com/watch?v=G6a5G5i4gQU)
- [reactively](https://github.com/milomg/reactively)
- [push-pull-push and signals explainer](https://milomg.dev/2022-12-01/reactivity)
