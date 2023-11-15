import { attribute, mutall_error } from '../../../schema/v/code/schema.js';
import { io_type } from '../../../schema/v/code/io.js';

//
// Define the namespace needed to create svg elements. This is needed by the
//metavisuo system. Its defined here to prevent cluttering the mataviouo namespace
export const svgns = 'http://www.w3.org/2000/svg';

//A view is the root of all classes in the outlook library, so, it holds methods
//that and properties that all outlook users can access
export class view {
    //
    //This is used for indexing a view object to support implementation of the
    //static 'current' property, as well as associateing this view with a state
    //object in the management of sessions. It is set when this view is
    //constructed. See onpopstate
    public key: number;
    //
    //Lookup storage for all views created by this application.
    static lookup: Map<number, view> = new Map();
    //
    //The current active view where the events (on a html page) are wired. E.g.
    //<button onclick=view.current.open_dbase()>Ok</button>
    static current: view;
    //
    //A view is associated with a win property. Typically it is the current
    //window, when the view is created. This variable is protected so that
    //it accessible only via getters and setters. This is important because
    //other derivatives of this class access the window property in different
    //ways. For instance, a baby page gets its window from its mother
    protected win__: Window = window;
    //
    //These are getter and setter to access the protected win variable. See
    //documention for propertu win__ above to appreciate the reason for using
    //of getters and setters in derived classes
    get win() {
        return this.win__;
    }
    set win(win: Window) {
        this.win__ = win;
    }
    //
    //The document of a view is that of its the window
    get document() {
        return this.win.document;
    }
    //
    //The id of a view is a unique name formed from its key, prefixed with
    //word view, e.g., view1, view2, etc.
    //Id is used in so many waus n a view. It is not useful to define it at this
    //level
    //public get id(){return `view${this.key}`}
    //
    //The children nodes of the root document element of this page
    //to support restoring of this page in response to the on pop state event.
    //The ordinary programmer is not expected to interact with this property,
    //so it is protected
    protected child_nodes: Array<ChildNode> = [];
    //
    //The end of time date is the highest valid date that the relational
    //databases can accommodate
    public static end_of_time: string = '9999-12-31';

    //
    constructor(
        //
        //The address  of the page. Some popup pages don`t have
        //a url that`s why it`s optional.
        public url?: string
    ) {
        //
        //Register this view identified by the last entry in the lookup table for views.
        //
        //The view's key is the count of the number of keys in the lookup.
        this.key = view.lookup.size;
        view.lookup.set(this.key, this);
    }

    //Returns an attribute's value, if it is available; otherwise an error
    public get_attribute_value(element: HTMLElement, name: string): string {
        //
        //Get the named attribute from the given element
        const value = element.getAttribute(name);
        //
        //The attribute must be set; otherwise its an error
        if (value === null) {
            //
            //Report teh error
            throw new mutall_error(
                `This element (see the console.log) has no attribute named ${name}.`,
                element
            );
        }
        //
        return value;
    }

    //Returns the values of the currently selected inputs
    //from a list of named ones
    public get_input_choices(name: string): Array<string> {
        //
        //Collect the named radio/checked inputs
        const radios = Array.from(this.document.querySelectorAll(`input[name="${name}"]:checked`));
        //
        //Map teh selected inputs to thiier values and return the collection
        return radios.map((r) => (<HTMLInputElement>r).value);
    }
    //
    //Returns the value from an identified input or textarea element.
    //The function will return null (rather than '' or fail) if there is no input
    //value. It returns Error if the value is empty and required
    public get_input_value(id: string): string | null | Error {
        //
        //Get the identified element.
        const elem = this.get_element(id);
        //
        //It must be an input  element or textarea.
        if (!(elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement))
            throw new mutall_error(`'${id}' is not an input or textarea element`);
        //
        //The desired value is.
        let value = elem.value === '' ? null : elem.value;
        //
        //If the value is required and is null, then return an error
        const value2 =
            elem.hasAttribute('required') && value === null
                ? new Error(`${id} is required`)
                : value;
        //
        //Return the desired value.
        return value2;
    }
    //
    //Returns the value of the checked radio button that has the given name.
    //Return null if there is no checked radio button. If any of the named
    //buttons has a required attribute, then an error is retirned if none is
    //checked
    public get_checked_value(name: string): string | null | Error {
        //
        //Get the radio button that matches the given name and is checked.
        const radio = this.document.querySelector(`input[name='${name}']:checked`);
        //
        //Do not continue with further checks if there is no checked radio button
        if (radio === null) {
            //
            //Get all the named radio buttons that have a required attribute
            const buttons = this.document.querySelectorAll(`input[name='${name}'][required]`);
            //
            //Required is true if there is at least one required button
            return buttons.length > 0 ? new Error(`${name} is required`) : null;
        }
        //
        //Ensure that the radio element is a HTMLInputElement.
        if (!(radio instanceof HTMLInputElement))
            throw new mutall_error(`The input named '${name}' is not a HTMLInputElement`);
        //
        //The radio button's value must be set. It is a sign a poorly designed form
        //if not
        if (radio.value === '') throw new mutall_error(`No value found for input named '${name}'`);
        //
        //Return the checked value.
        return radio.value;
    }
    //
    //Get the selected value from the identified selector.
    //There must be a selected value.
    public get_selected_value(id: string): string {
        //
        //Get the Select Element identified by the id.
        const select = this.get_element(id);
        //
        //Ensure that the select is a HTMLSelectElement.
        if (!(select instanceof HTMLSelectElement))
            throw new mutall_error(`The element identified by '${id}' is not a HTMLSelectElement.`);
        //
        //Ensure that the select element value is set.
        if (select.value === '')
            throw new mutall_error(
                `The value of the select element identified by '${id}' is not set.`
            );
        //
        //Return the selected value
        return select.value;
    }

    //Create a new element from  the given tagname and attributes
    //we assume that the element has no children in this version.
    public create_element<
        //
        //The tagname is the string index of the html map.
        tagname extends keyof HTMLElementTagNameMap,
        //
        //Collection of attributed values. The typescript Partial  data type
        //is a short form of
        //attribute_collection extends {[key in attribute_name]?:HTMLElementTagNameMap[tagname][key]}
        attribute_collection extends Partial<HTMLElementTagNameMap[tagname]>
    >(
        //
        //The element's tag name
        tagname: tagname,
        //
        //The parent of the element to be created.
        anchor: HTMLElement,
        //
        //The attributes of the element
        attributes?: attribute_collection
    ): HTMLElementTagNameMap[tagname] {
        //
        //Create the element holder based on the td's owner document
        const element = this.document.createElement(tagname);
        //
        //Attach this element to the anchor, if the anchor is defined
        if (anchor !== undefined) anchor.appendChild(element);
        //
        //Loop through all the keys to add the atributes, if they are defoned
        if (attributes !== undefined)
            for (let key in attributes) {
                const value: any = attributes[key];
                //
                // JSX does not allow class as a valid name
                if (key === 'className') {
                    //
                    //Take care of multiple class values
                    const classes = (<string>value).split(' ');
                    classes.forEach((c) => element.classList.add(c));
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else if (key.startsWith('on') && typeof attributes[key] === 'function') {
                    element.addEventListener(key.substring(2), value);
                } else {
                    // <input disable />      { disable: true }
                    if (typeof value === 'boolean' && value) {
                        element.setAttribute(key, '');
                    } else {
                        //
                        // <input type="text" />  { type: "text"}
                        element.setAttribute(key, value);
                    }
                }
            }
        //
        //Rteurn the element
        return element;
    }
    //
    //Return the identified element, if it exists. If it does not, then throw an
    //exception
    get_element(id: string): HTMLElement {
        //
        //Get the identified element from the current browser context.
        const element: HTMLElement | null = this.document.getElementById(id);
        //
        //Check the element for a null value
        if (element === null) throw new mutall_error(`The element identified by #${id} not found`);
        //
        //Return (found) the element
        return element;
    }

    //Search and return the the only element selected by the gigen css
    //css selector; it is an error if more than 1 or none is found.
    query_selector(css: string): HTMLElement {
        //
        //Get the identified element from the current browser context.
        const elements: Array<Element> = Array.from(this.document!.querySelectorAll(css));
        //
        //If there is more than one element, warn the user
        if (elements.length > 1)
            throw new mutall_error(`There are ${elements.length} elements selected by ${css}`);
        //
        //Check the elements is empty
        if (elements.length === 0)
            throw new mutall_error(`The element with selector ${css} not found`);
        //
        //Return (the only found) the )HML) element
        return <HTMLElement>elements[0];
    }

    //Show or hide the identified a window panel. This method is typeically
    //used for showing/hiding a named grou of elements that must be shown
    //or hidden as required
    public show_panel(id: string, show: boolean): void {
        //
        //Get the identified element
        const elem = this.get_element(id);
        //
        //Hide the element if the show is not true
        elem.hidden = !show;
    }

    //Use the Luxon library to return the date and time for now() formated in
    //the way  MYsql expects it.
    public now(): string {
        //
        //Discontinue the lusxon library
        //return luxon.DateTime.now().toFormat('YYYY-MM-DD hh:mm:ss');
        //
        //se the alternative method to get a mysql-compatible date strin for
        //now();
        return view.standardise_date(new Date());
    }
    //
    //This is a general procedure for standardising conversion of dates to mySQL
    //compatible string format. I still a problem importing from a node_modules
    //library. Js won't understand import * as y from "x". It only understands
    //paths of the form: "./x.js" "../x.js", "/a/b/c/x.js". Perhaps its time to
    //learn how to use webpack. For now, use the native Js metod of convering the
    //date to a ISOstring, then replacing the T with a space and Z with noting
    static standardise_date(date: Date): string {
        //
        //Discontinue using the lucon libray
        //return luxon.DateTime.fromJSDate(date).toFormat('YYYY-MM-DD hh:mm:ss');
        //
        //Use the given date to bject and ...
        const str = date
            //
            //Convert the date ISO string, e.g., "2023-01-27T00:12:00.0000Z"
            .toISOString()
            //
            //Replace the T with a space
            .replace('T', ' ')
            //
            //Remove the trailing Z for Zulu zone
            .replace('Z', '');
        //
        //Return the result as, e.g. "2023-01-27 00:12:00.0000" Will Mysql
        //accept the .0000 bit? Not sure.
        return str;
    }
    //
    //Exploit typical layouts of input element on form to extract values. This assumes that
    //we can extract enough information from the form to determine, e.g,
    //- data colection elements
    //- the type of input, i,e. simple text or use of radio buttons
    //- if any input is required or not
    //This information can be supplied using dataset technology in HTML using tags such as
    //data-required, data-io type, etc or  at the input level using regular input attributes, i.e.,
    //required, type, name or id
    //The given data-field is used to identify a data collection enveloping tag ;
    //the dataset attributes can be specified on this element. or on the actual
    //input element
    //The output will be determined by the iotype of the input element and
    //the condition weather the data is required or not.
    //Bellow are examples of arrangement that are respected when getting values from
    //input elements:-
    /*
    <label data-field="username" data-required="true" data-iotype="text">
        Username:<input type="text"> 
    </label>
    
    or
    <label data-field>
        Username: 
        <input id='username' type = 'text' maxlength='30' size='30' required>
    </label>
    
    the above method is particularly usefull whenever we will be required to access
    the input element directly.
    or
    <label data-field>
        Username: 
        <input name='username' type = 'text' maxlength='30' size='30' required>
    </label>
    */
    public get_value(df_name: string): string | null | Error {
        //
        //Usint the given identifier get the envelop. In the above cases the
        //label The env should be explicitly marked with a data-field attribute
        //
        //TO accomodate initial usage of get value find the element with the given id
        const env:HTMLElement = this.document.getElementById(df_name) ?? this.get_envelop(df_name);
        //
        //Get the io type. Currently only 4 are supported; they are text, text area,
        // radio and select. If no io type is available, we assume this is a simple input
        const io_type: io_type = this.get_io_type(env);
        //
        //Use the envelop and io type to get the raw value, string or null. For check boxes,
        //if there is nothing checked, the raw value is null. For simple input, the null is a
        //zero-length string
        let raw: string | null = this.get_raw_value(env, io_type);
        //
        //Determine whether the value is required or not
        const is_required: boolean = this.is_required(env);
        //
        //If an input is required and it is empty, return the an error
        if (is_required && raw === null) return new Error(`Input '${df_name}' is required`);
        //
        //Otherwise return the raw value
        return raw;
    }
    //
    //Given a data collection element this procedure is responsible for reading and
    //determining weather or not the data to be collected is mandatory or optional
    //returning a boolean value
    //The infomation is either gotten at the envelop level that is the element that houses the
    //input element or at the level of the input element.At the envelop level it is provided
    //via the dataset technology in an attribute data-required whereas in the input element level
    //The same infomation is provided via the the required attribute of the input element
    //Bellow are samples to depict the above scenario:-
    /*
    At the envelop level :-

    <label data-field="username" data-required="true" data-iotype="text">
        Username:<input type="text"> 
    </label>

    At the input level :-

    <label data-field="username">
        Username:<input type="text" requred> 
    </label>
     */
    private is_required(env: HTMLElement): boolean {
        //
        //Get the value of the custom attribute at the envelop level
        //
        //If the attribute is present return a true
        if (env.dataset.required) return true;
        //
        //We did not find the custom attribute at the envelop level
        //Get all the children of the envelop
        //
        //filter to get all the children with the required attribute
        const results: Array<Element> = Array.from(env.children).filter((child) =>
            Array.from(child.attributes).find((attribute) => attribute.name === 'requrird')
        );
        //
        //Ensure that no more than one element was collected
        if (results.length > 1)
            throw new mutall_error(
                `We expected only one input element but fount ${results.length} check your form design`
            );
        //
        //Return false if no element was gotten and true if one element was retrieved
        return results.length ? true : false;
    }
    //
    //
    //Get the element with a data-field attribute specified by the df_name
    //If no such element exist look for all data entry elements (i.e., element
    //with the data-field attribute) in the example bellow the label element.
    //After getting all data collection elements within the collected envelops
    //filter to get an envelop which has an element with the given df_name as
    //a name or id
    /*
        the label will be returned as the envelop
        <label data-field="username" data-required="true" data-iotype="text">
            Username:<input type="text"> 
        </label>

        or
        The label will be returned since it has a datafield tag and also contains 
        an input tag with labeld by an id simmilar to the datafield name 

        <label data-field>
            Username: 
            <input id='username' type = 'text' maxlength='30' size='30' required>
        </label>

        the above method is particularly usefull whenever we will be required to access
        the input element directly.
        
        or
        The label will be returned since it has a datafield tag and also contains 
        an input tag with labeld with a name simmilar to the datafield name 
        <label data-field>
            Username: 
            <input name='username' type = 'text' maxlength='30' size='30' required>
        </label>
    */
    private  get_envelop(df_name: string): HTMLElement {
        //
        //Get the identified enveloping element, e.g. the label element in the
        //our example
        //
        //Get the datafield element with the given datafield name
        const env: HTMLElement | null = this.document.querySelector(`*[data-field = "${df_name}"]`);
        //
        //Check to ensure that the element exist
        //If the element exist return the element
        if (env) return env;
        //
        //If no element was found we assume that the user might have labeld at
        //the input level
        //
        //Get all data collection elements
        const target: Array<Element> = Array.from(this.document.querySelectorAll('*[data-field]'));
        //
        //Within the data collection elements establish the elements with children
        //that have id or name attribute with a value matching the df_name
        const envelop: Array<Element> = target.filter((target) => {
            //
            Array.from(target.children).filter(
                (child) => child.getAttribute('name') || child.getAttribute('id') === df_name
            );
        });
        //
        //Check to see if there was any element at all
        if (envelop.length === 0)
            throw new mutall_error(
                `No envelop or input element identified by ${df_name} was found`
            );
        //
        //Ensure that we retrived only one element
        if (envelop.length > 1)
            throw new mutall_error(
                `We expected only one element identified by the ${df_name} but got ${envelop.length}`
            );
        //
        //Cast and return the gotten envelop
        return envelop[0] as HTMLElement;
    }
    //
    //Get the io-type from a given envelop element; its found in the data-iotype
    //attribute at the envelop level or the type attribute of the input.
    //Assume it is 'text' if the attribute is not found
    private get_io_type(env: HTMLElement): io_type {
        //
        //Get the io-type (string) from the envelop element or at the input level
        // if it is defined; otherwise assume it is simple text
        const text: string = this.extract_io(env) ?? 'text';
        //
        //Translate the text to a matching io
        switch (text) {
            //
            //Simple text input (without size)
            case 'text':
                return { type: 'text' };
            //
            //Text area input
            case 'textarea':
                return 'textarea';
            //
            //Radio input
            case 'radio':
                return 'radios';
            //
            //Dropdown selector
            case 'select':
                return 'select';
            //
            //Any orher case is a mistatch and should be reported to the programmer
            default:
                throw new mutall_error(`'${text}' is not a valid io_type`);
        }
    }
    //
    //Extract the iotype of the input element or from the actual evneloping tag
    //If provided for at the envelop level read the value of the data-iotype attribute
    //otherwise read the value of the type attribute of the input element
    //Bellow are examples:-
    /*
    Envelop level :-
        <label data-field data-iotype = 'text'>
            Username: 
            <input id='username' maxlength='30' size='30' required>
        </label>

    Input level:- 
        <label data-field>
            Username: 
            <input id='username' type = 'text' maxlength='30' size='30' required>
        </label>
    */
    //
    //????? Other data collection elements other than input elements
    //do not have the type attribute hence making it difficult to know the io type of
    //data being collected
    private extract_io(env: HTMLElement): string | undefined {
        //
        //Get all the attributes of the envelop
        const attributes: Array<Attr> = Array.from(env.attributes);
        //
        //Search for the data-iotype attribute amongest the envelop attributes
        const io_type: Attr | undefined = attributes.find(
            (attribute) => attribute.name === 'data-iotype'
        );
        //
        //If the data-iotype exists extract the value and return it
        if (io_type) return io_type.value;
        //
        //Otherwise get all the children of the envelop
        const children: Array<Element> = Array.from(env.children);
        //
        //From the children extract the child with a type attribute
        const input: Array<Element> = children.filter((child) =>
            Array.from(child.attributes).find((attribute) => attribute.name === 'type')
        );
        //
        //Ensure that there was an input element retrived
        //??
        if (input.length === 0) return undefined;
        //
        //Ensure that the envelope has at most one input element
        if (input.length > 1)
            throw new mutall_error(
                `Your envlop has${input.length} elements while we expected it to have one!`
            );
        //
        //Now extract the value of the attribute  and return it
        return input[0].getAttribute('type')!;
    }
    //
    //Use the envelop and io type to get the raw alue as text or null. For
    //radios/check boxes and selector if there is nothing checked, the raw value
    // is null. For simple input, the null is a zero-length, or name 'null' string.
    private get_raw_value(env: HTMLElement, io_type: io_type): string | null {
        //
        //Translate the text to a matching io
        switch (io_type) {
            //
            //Getting input form a radio
            case 'radios':
                return this.get_radio_value(env);
            //
            //Getting input from a select input / dropdown selector
            case 'select':
                return this.get_text_value(env);
            //
            //Getting input from a text area
            case 'textarea':
                return this.get_text_value(env);
            //
            //Any orher case is a mistatch and should be reported to the programmer
            default:
                //
                //Test if the io type of of the complext type. E.g.,
                //{type:'text', size:10}
                if (typeof io_type === 'object' && 'type' in io_type) {
                    //
                    //Destructructure to get the type
                    const { type } = io_type;
                    //
                    //Depending on the type....
                    switch (type) {
                        case 'text':
                            return this.get_text_value(env);
                        default:
                            throw new mutall_error(`'${type}' is not a valid io-type`);
                    }
                }
                //Unknown io type
                //
                throw new mutall_error(`Unable to get the value of '${io_type}' io_type`);
        }
    }
    //
    //Retrieve value from selector elements such as radio and checkboxes
    /*
    <fieldset id="operation" data-iotype="radio" data-required="true">
        <legend >What do you want to do?</legend>
        <label>
            <input type="radio" value ="up" name="option"> Sign Up to be Member
        </label>

        <label>
            <input type="radio" value="in" name="option"> Sign In as Member
        </label>
        <span class="error"></span>
    </fieldset>
    
    In this case, fieldset is the envlop element
    */
    private get_radio_value(env: HTMLElement): string | null {
        //
        //Collect all the radio buttons in under this envelop
        const radios: NodeListOf<HTMLElement> = env.querySelectorAll('input[type=radio]');
        //
        //There must be at least 2
        if (radios.length < 2)
            throw new mutall_error(
                `At least 2 radio buttons are expected. ${radios.length} was found. See the console log`,
                radios
            );
        //
        //Collect all radio buttons that are checked
        const checkeds: NodeListOf<HTMLElement> = env.querySelectorAll('input[type=radio]:checked');
        //
        //Return a null if none of them is checked
        if (checkeds.length === 0) return null;
        //
        //If more than one is cehcked, this is a poor form design
        if (checkeds.length >= 2)
            throw new mutall_error(
                `Check you form. ${checkeds.length} buttons are checked. Only 1 was expected`
            );
        //
        //Get the (trimmed) value of the checked button
        const value = (<HTMLInputElement>checkeds.item(0)).value.trim();
        //
        //Return null if the input has an empty value, or is explicily entered
        //as null
        return ['', 'null'].includes(value.toLowerCase()) ? null : value;
    }
    //
    //Retrieve value from a child input (of an enveloping element) that has a
    //value key
    private get_text_value(env: HTMLElement): string | null {
        //
        //Select all the elements that are immediate children of the envelop
        const all_elements: Array<any> = Array.from(env.children);
        //
        //Select only those cases that have a value key
        const elements: Array<any> = all_elements.filter((e) => 'value' in e);
        //
        //Its a design fault if no element can be found
        if (elements.length === 0) throw new mutall_error('No element with a value key found', env);
        //
        //It is also a form design fault if more than 1 element is found
        if (elements.length > 1)
            throw new mutall_error(
                `Only 1 value element is expected. ${elements.length} were found`
            );
        //
        //Get the only element's value and trim it
        const value: string = elements[0].value.trim();
        //
        //Return null if the input has an empty value, or is explicitly entered
        //as null
        return ['', 'null', 'undefined'].includes(value.toLowerCase()) ? null : value;
    }

    //
    //Report the given message in the identified element. If the specific element
    //does not exist (e.g., perhaps it does not refer to a user defined input),
    //then use the general reporting id -- which must exist
    //Here is the expected relationhip between the enveloping (label) and the error
    //reporting elements
    /*
    <label id='test' data-iotype='text' data-required>
        User Input <input type='text'/> <span>*</span>
        
        <!-- Place holder for repoering errors specific to this input-->
        <span class='error'></span>
    </label>
    ..
    <!-- For reporting that is nt input specific -->
    <div id="report"/>
    */
    //Is return undefined as a result. This construct allows us to implement
    //a situation when we need to report and return immediately
    /*
    
    if (x) return report_error(....)
    
    instead of
    
    if (x) {report_error(...); return}
    
    */
    //
    public report_error(id: string, msg: string): undefined {
        //
        //Get the identified envelop element, label, in our example
        const envelop: HTMLElement | null = this.document.getElementById(id);
        //
        //If the envelop does not exist, then it means we dont have a specific
        //field for reporting this error. Use the general reporting placeholder,
        //and take care of existing error messages
        if (envelop === null) {
            //
            //There is no envelop element: Use the general reporting element
            const general: HTMLElement = this.get_element('report');
            //
            //Respect messages that came before this one
            general.innerHTML = `${general.innerHTML} <br/> ${msg}`;
        } else if (envelop.id === 'report') envelop.innerHTML = `${envelop.innerHTML} <br/> ${msg}`;
        else {
            //The envelop exists. Use specific element for reporting locally
            const local: HTMLElement | null = envelop.querySelector('.error');
            //
            //If there is no local place for reporting, then this is a badly
            //designed form. Let the designer know this(and console.log teh eror as well).
            if (!local)
                throw new mutall_error(
                    `This enveloping element '${id}' has no error reporting element`,
                    msg
                );
            //
            //Now report the error message (assuming is is formatd as html text)
            local.innerHTML = msg;
        }
        //
        return undefined;
    }
    //
    //A coustom alert to repalce the normal js alert using dialog technology
    //
    public static myalert(message:string):void{
        //
        //Create a dialog element that is used to server the message
        const dlg: HTMLDialogElement = document.createElement("dialog");
        //
        //Append the message to  the dialog with the assumption that it is html
        //formated
        dlg.innerHTML = message;
        //
        //Create a cancel button which is responsible for closing the dialog
        //
        //Create button
        const cancel:HTMLButtonElement = document.createElement("button");
        //
        //Assign onclick listener
        cancel.onclick = ()=> dlg.close();
        //
        //Append the cancel button to the dialog
        dlg.appendChild(cancel);
        //
        //Append the dialog to the document body 
        document.appendChild(dlg);
        //
        //Finally show the created dialog box
        dlg.showModal();
    }
}

//A page is a view with display panels
export class page extends view {
    //
    //A page has named panels that the user must ensure that they
    //are set before they are shown.
    protected panels: Map<string, panel>;

    constructor(url?: string) {
        super(url);
        //
        //Initialize the panels dictionary
        this.panels = new Map();
    }

    //
    //The user must call this method on a new application object; its main
    //purpose is to complete those operations of a constructor that require
    //to function synchronously
    async initialize(): Promise<void> {
        //
        //Set the window for this page
        this.win = await this.open();
        //
        //Add the pop state listener to ensure that if a history back button
        //is clicked on, we can restore this page
        this.win.onpopstate = (evt) => this.onpopstate(evt);
    }
    //Handle the on pop state listener by saving the current state and
    //restoring the view matching the event's history state
    protected onpopstate(evt: PopStateEvent) {
        //
        //Ignore any state that has no components to restore. Typically
        //this is the initial state placed automatically on the history
        //stack when this application loaded initially. For this version, the
        //null state is never expected because we did replace it in this
        //application's initializetion
        if (evt.state === null) throw new mutall_error('Null state unexpected');
        //
        //Get the saved view's key
        const key = <number>evt.state;
        //
        //Use the key to get the view being restored. We assume that it must be
        //a baby of the same type as this one
        const new_view = <page>view.lookup.get(key);
        //
        //It is an error if the key has no matching view.
        if (new_view === undefined) throw new mutall_error(`This key ${key} has no view`);
        //
        //Restore the components of the new view
        new_view.restore_view(key);
    }

    //
    //The default way a quiz view shows its content is
    //by looping through all its panels and painting
    //them. A quiz view without panels can override this method
    //to paint their contents.
    public async show_panels(): Promise<void> {
        //
        //The for loop is used so that the panels can throw
        //exception and stop when this happens
        for (const panel of this.panels.values()) {
            await panel.paint();
        }
    }

    //Restore the children nodes of this view by re-attaching them to the
    //document element of this page's window.
    public restore_view(key: number): void {
        //
        //Get the view of the given key
        const View = view.lookup.get(key);
        //
        //It's an error if the view has not been cached
        if (View === undefined) throw new mutall_error(`This key ${key} has no matching view`);
        //
        //Get the root document element.
        const root = View.document.documentElement;
        //
        //Clean the root before restoring it -- just in case the view
        //is attached to an old window;
        Array.from(root.childNodes).forEach((node) => root.removeChild(node));
        //
        //Attach every child node of this view to the root document
        this.child_nodes.forEach((node) => root.appendChild(node));
    }

    //Opening a page makes visible in the users view. All pages return the
    //current window. Only popups create new ones.
    async open(): Promise<Window> {
        return window;
    }

    //Remove a quiz page from a users view and wait for the base to rebuild.
    //In popups we simply close the window; in babies we do a history back,
    //and wait for the mother to be reinstated. In general, this does
    //nothing
    async close(): Promise<void> {}

    //Save the children of the root document element of this view to the history
    //stack using the 'how' method
    public save_view(how: 'pushState' | 'replaceState'): void {
        //
        //Get the root document element
        const root = this.document.documentElement;
        //
        //Save the child nodes to a local property
        this.child_nodes = Array.from(root.childNodes);
        //
        //Save (by either pushing or replacing) this view's state to the
        //windows session history indirectly -- indirectly because we don't
        //acutally save this view to the session history but its unique
        //identification key -- which then is used for looking up the view's
        //details from the static map, view.lookup
        this.win.history[how](
            //
            //The state object pushed (or replaced) is simply the key that
            //identifies this view in the static look for views, view.lookup
            this.key,
            //
            //The title of this state. The documentation does not tell us what
            //it is really used for. Set it to empty
            '',
            //
            //This browser bar info is not very helpful, so discard it
            ''
        );
    }

    //Show the given message in a report panel, Depending on the nature of the
    //resport, the appropriate styling is applied
    async report(error: boolean, msg: string) {
        //
        //Get the report node element
        const report = this.get_element('report');
        //
        //Add the error message
        report.textContent = msg;
        //
        //Style the report, depending on the error status
        if (error) {
            report.classList.add('error');
            report.classList.remove('ok');
        } else {
            report.classList.add('ok');
            report.classList.remove('error');
        }
    }
}

//A panel is a targeted section of a view. It can be painted
//independently
export abstract class panel extends view {
    //
    //The panel's target element is set (from css in the constructor arguments)
    //when the panel is painted
    public target?: HTMLElement;
    //
    constructor(
        //
        //The CSS to describe the targeted element on the base page
        public css: string,
        //
        //A base view is the home of the panel
        public base: view
    ) {
        //The ur (required to initialize a view) is that of the base
        super(base.url);
    }
    //
    //Start painting the panel
    async paint(): Promise<void> {
        //
        //Get the targeted element. It must be only one
        const targets = Array.from(this.document.querySelectorAll(this.css));
        //
        //There must be a target
        if (targets.length == 0) throw new mutall_error(`No target found with CSS ${this.css}`);
        //
        //Multiple targets is a sign of an error
        if (targets.length > 1)
            throw new mutall_error(`Multiple targets found with CSS ${this.css}`);
        //
        //The target must be a html element
        if (!(targets[0] instanceof HTMLElement))
            throw new mutall_error(`
        The element targeted by CSS ${this.css} must be an html element`);
        //
        //Set the html element and continue painting the panel
        this.target = targets[0];
        //
        //Continue to paint the pannel. This method is implemented differently
        //depending the obe extending class
        await this.continue_paint();
    }
    //
    //Continue painting the this pannel -- depending on its nature.
    public abstract continue_paint(): Promise<void>;
    //
    //The window of a panel is the same as that of its base view,
    //so a panel does not need to be opened
    get win() {
        return this.base.win;
    }
}
