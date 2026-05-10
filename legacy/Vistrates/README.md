<h2>Vistrate</h2><p>Vistrate provides basic reactive dataflow based means for implementing visualisations.<ul>
	<li>Use 'VC' in the top menu to create a new vis component template.</li>
	</ul></p><p>Vis component controller code paragraphs take the following form:</p>
<pre><code>vc = {
  data: "id-of-vis-data",
  src: ["mySourceName_1", ..., "mySourceName_n"],
  props: ["myProp_1", ..., "myProp_m"],
  libs: ["myLibraryStoredAsAsset.js", "https://somecdn.com/anotherLibrary.js"],
  init: function() {
    ...
  },
  destroy: function() {
    ...
  }
  update: function() {
    ...
  }
}</code></pre>
<ul>
	<li><code>data</code>: An (optional) ID of a data paragraph specifying the configuration of the components and its stored data.</li>
	<li><code>src</code>: A list of names for the sources of this component.</li>
  <li><code>props</code>: A list of property names that can be mapped to properties on sources</li>
	<li><code>libs</code>: A list of JavaScript libraries that this component should load. They are loaded before init and updated are called. The list can contain references libraries stored as assets or links to libraries stored externally.</li>
	<li><code>init</code>: This method is called when the component is initialized. It is called every time the user (or remote user) executes the code paragraph.</li>
	<li><code>destroy</code>: When the code paragraph of a vis component is (re)executed this method is called before the code of the methods are replaced.</li>
	<li><code>update</code>: Called every time the data of a source component is updated.</li>
</ul>

<p>
	The data paragraph of a vis component has the following format:
</p>
<pre><code>{
  config: {
    src: {"mySourceName_1": "source_1_id", ... , "mySourceName_n": "source_n_id"},  
    props: {
      "myProp_1": {
        "src": "mySourceName_1", 
        "prop": "somePropOnSource"}
        , ..., 
       "myProp_m": {
         "src": "mySourceName_n",
         "prop": "someOtherPropOnSource"}
    },
    view: "id-of-vis-view"
  },
  data: {
   /* The data of the component */
  }
}</code></pre>
<ul>
	<li><code>src</code>: (Optional) output source mapping. The ids should be the vis controller ids. The output data of a source is e.g. accessible through <code>this.src.mySourceName_1.output</code></li>
	<li><code>props</code>: (Optional) mapping from named properties to properties on the sources. These are accessible through e.g. <code>this.props.myProp_1</code> and given the example above this would point to <code>this.src.mySourceName_1.output.somePropOnSource</code></li>
	<li><code>view</code>: The (optional) ID of a view component. Accesible through <code>this.view</code>.</li>
	<li><code>data</code>: Arbitrary (serializable) JSON can be stored here. The data is accessible through <code>this.data</code> and can be set through e.g. <code>this.data = {"foo": "bar"}</code></li>
</ul>

<p>
	The first time a vis controller code paragraph is executed a VisController is instantiated the <code>src</code>, <code>view</code> and <code>data</code> is populated with, and the <code>init</code>, <code>destroy</code> and <code>update</code> methods added to the instance. When a vis component code paragraph is re-executed the methods of the instance are swapped with the (potentially) changed methods from the code paragraph.
</p>

<p>
	Every component has a <code>output</code> property. When this property is set, all observing components are notified triggering a call to their <code>update</code> method.
</p>
<p>
	The content of a VisView (stored in the <code>view</code> property of a component) can be set using the setter <code>this.view.content</code>. It can either be set to an HTML string or a DOM element. <code>this.view.element</code> returns the root DOM element of a VisView. The content of a VisView is always <a href="https://webstrates.github.io/userguide/api/transient.html">transient</a>.
</p>

# Properties

| Property | Value |
| :--- | :--- |
| Name | Vistrate |
| ID | kTKppb2i |
| Version | 0.15.18 |
| Description | Vistrate provides basic reactive dataflow based means for implementing visualisations. |
| Tags | `visualization, data flow, programming` |
| Assets | - |
| Dependencies | - |
| Changelog | `{"0.15.18":"Renaming global menu entries from Codestrate to Vistrate","0.15.17":"Run-on-add class on viscontroller executes the paragraph when it is added to the document.","0.15.16":"Added sourceURL to make debugging of VC code possible.","0.15.15":"New style for create vistrate component dialog.","0.15.14":"Introduced moveTo and moveBack methods on VisView","0.15.13":"Fixed issue with overwiting view when reloading config","0.15.12":"Disabled function from 0.15.11 temporarily","0.15.11":"Added option to set run-on-add class on viscontroller paragraph, which will run the paragraph when the component is added after loaded","0.15.10":"Fixed issue where components would only work if they were in the same order in the document as connected in the pipeline","0.15.9":"Disabled clipping on visviews","0.15.8":"Introduced skip class for skipping paragraphs in components","0.15.7":"Updated style of component creator","0.15.6":"Added friendlyName to controller, i.e. so we can have more meaningful names for the Vistrate Component Canvas","0.15.5":"Fixed issue with naming when creating components from template.","0.15.4":"Props are now removed when the config object is edited.","0.15.3":"Props can now programatically be added.","0.15.2":"Added viewClassNames property to config to set custom classes to the controller view element.","0.15.1":"The controller config is now exposed and accessible as this.config in the controller functions init, destroy, and update.","0.15":"The vis controller configuration now allows for setting the tagName for the vis view","0.14.4":"Updated package to use #section-utils to create a section instead of replicating the functionality in Vistrates packages (this will only work with the most recent codestrate version)","0.14.3":"Fixed bug that would return the label for a property even when the value exists but the value evaluates to false (i.e. number 0 and boolean false).","0.14.2":"Another minor bug fix","0.14.1":"Minor bug fixes","0.14":"Added prelimenary component template support","0.13.1":"Property mapping change so if value on source doesn't exist the property name as a string is returned","0.13":"Introduced property mapping","0.12.6":"Fixed VC template","0.12.5":"Fixed timing issue with libs","0.12.4":"VisController's data property now returns a copy of the data","0.12.3":"Sources can now programatically be added and removed.","0.12.2":"A component can now only have the named sources","0.12.1":"Minor bug fixes","0.12":"Sources is now a map from source name to source ID","0.11.3.1":"Minor bug fix","0.11.3":"Reverted previous changes (didn't work as intended). Added source to update","0.11.2":"Minor simplifications in handling of scope on controller methods (thanks kba!)","0.11.1":"Made view part of data, making it reconfigurable on runtime","0.11":"Substantial rewrite, see documentation and examples.","0.10.1":"Fixed issue with importing libs being asynchronous. NB: Still not completely fixed, update of a component with libs may be called from another component before init has been called.","0.10":"Added a libs property to handle import of external libs before init is called","0.9.2":"Updated documentation and examples","0.9.1":"Fixed issue where reloading codestrate would trigger re-run of all remote vis components","0.9":"Added store property to data paragraph vis component","0.8.1":"Changed vis component template and icon font","0.8":"Added support for observing the state of the Vistrate singleton","0.7":"Added VisView component and viscomponents can now have a view property for easy outputting","0.6.1":"Fixed bug where a viscomponent without a src property would cause and error","0.6":"Added Vistrate.store to store data back into a viscomponent data paragraph","0.5":"Now allows for a component to have multiple data sources","0.4":"Fixed scoping issue in viscomponent code","0.3":"Vis components can now have a init and destroy method","0.2":"Now supports remote execution of viscomponent code paragraphs","0.1":"Initial version."}` |