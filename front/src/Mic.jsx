const Mic = () => {
    return (
        <div className="mic">
            <MicSvg />
        </div>
    );
}

export default Mic;

const MicSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65.4 107.2">
        <g>
            <path d="m32.7,68.8c-8.9,0-16.1-7.3-16.1-16.2V16.2C16.6,7.2,23.8,0,32.7,0s16.1,7.3,16.1,16.2v36.3c0,9-7.2,16.3-16.1,16.3h0Zm21.9-26.5h10.8v13.8c0,15.4-12.1,28.1-27.3,29v11.3h16.2v10.8H11.1v-10.8h16.2v-11.3c-15.2-.9-27.3-13.6-27.3-29v-13.8h10.8v13.8c0,10.1,8.2,18.2,18.2,18.2h7.3c10.1,0,18.2-8.2,18.2-18.2v-13.8h.1Z" />
        </g >
    </svg >
)