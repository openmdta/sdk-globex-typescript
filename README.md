# OpenMDTA TypeScript SDK template

This client is built by the managed SDK generator. The generator supplies the
package name, version, deployed Dataset shortcuts, service bindings, SBE types,
and Catalog contracts.

The public source template has no checked-in `src/generated` directory. Run
`mise run sdk-build` there to generate and typecheck a customer-neutral fixture.

For a configured Dataset, `read` and `lookup` require a Catalog reader, `search`
requires an indexed Catalog reader, `latest` requires a Latest endpoint, and
timeseries methods require a Timeseries endpoint. The generated type and runtime
surface follow those deployed capabilities.
